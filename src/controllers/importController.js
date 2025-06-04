import Import from '../models/Import.js';
import ImportItem from '../models/ImportItem.js';
import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import InventoryLog from '../models/InventoryLog.js';

// @desc    Get all imports
// @route   GET /api/imports
// @access  Private
export const getImports = async (req, res) => {
  try {
    const imports = await Import.find({}).sort({ importDate: -1 });
    res.json(imports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get import by ID
// @route   GET /api/imports/:id
// @access  Private
export const getImportById = async (req, res) => {
  try {
    const importDoc = await Import.findById(req.params.id);
    const importItems = await ImportItem.find({ importId: req.params.id });

    if (importDoc) {
      res.json({ ...importDoc.toObject(), items: importItems });
    } else {
      res.status(404).json({ message: 'Import not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create import
// @route   POST /api/imports
// @access  Private/Admin
export const createImport = async (req, res) => {
  try {
    const { supplierId, importItems, note } = req.body;

    // Verify supplier exists
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Calculate total
    let totalAmount = 0;
    for (const item of importItems) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }
      totalAmount += item.quantity * item.unitPrice;
    }

    // Create import
    const importDoc = await Import.create({
      supplierId,
      supplierName: supplier.name,
      totalAmount,
      note,
      createdBy: req.user._id,
    });

    // Create import items and update product stock
    for (const item of importItems) {
      const product = await Product.findById(item.productId);
      await ImportItem.create({
        importId: importDoc._id,
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });

      // Update product stock
      product.stock += item.quantity;
      await product.save();

      // Create inventory log
      await InventoryLog.create({
        productId: item.productId,
        type: 'import',
        quantity: item.quantity,
        note: `Import from ${supplier.name}`,
      });
    }

    res.status(201).json(importDoc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete import
// @route   DELETE /api/imports/:id
// @access  Private/Admin
export const deleteImport = async (req, res) => {
  try {
    const importDoc = await Import.findById(req.params.id);
    
    if (!importDoc) {
      return res.status(404).json({ message: 'Import not found' });
    }

    // Get import items
    const importItems = await ImportItem.find({ importId: req.params.id });

    // Revert inventory changes
    for (const item of importItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock -= item.quantity;
        await product.save();

        // Create inventory log for the reversion
        await InventoryLog.create({
          productId: item.productId,
          type: 'export',
          quantity: item.quantity,
          note: `Reverting import #${importDoc._id}`,
        });
      }
    }

    // Delete import items
    await ImportItem.deleteMany({ importId: req.params.id });

    // Delete import
    await importDoc.deleteOne();

    res.json({ message: 'Import removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 