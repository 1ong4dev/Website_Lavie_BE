import Purchase from '../models/Purchase.js';
import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import PurchaseItem from '../models/PurchaseItem.js';

// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private
export const getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find({}).sort({ purchaseDate: -1 });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get purchase by ID
// @route   GET /api/purchases/:id
// @access  Private
export const getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    const items = await PurchaseItem.find({ purchaseId: req.params.id });
    if (purchase) {
      res.json({ ...purchase.toObject(), items });
    } else {
      res.status(404).json({ message: 'Purchase not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create purchase
// @route   POST /api/purchases
// @access  Private/Admin
export const createPurchase = async (req, res) => {
  try {
    const { supplierId, items, notes } = req.body;
    // items: [{ productId, quantity, unitPrice }]
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    let totalAmount = 0;
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }
      totalAmount += item.quantity * item.unitPrice;
      // Update product stock
      product.stock += item.quantity;
      await product.save();
    }
    const purchase = await Purchase.create({
      supplierId,
      supplierName: supplier.name,
      totalAmount,
      paidAmount: 0,
      notes,
      createdBy: req.user._id,
    });
    // Lưu chi tiết sản phẩm nhập hàng
    for (const item of items) {
      const product = await Product.findById(item.productId);
      await PurchaseItem.create({
        purchaseId: purchase._id,
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      });
    }
    res.status(201).json(purchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Pay purchase debt
// @route   PUT /api/purchases/:id/pay
// @access  Private/Admin
export const payPurchase = async (req, res) => {
  try {
    const { amount } = req.body;
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    purchase.paidAmount += amount;
    await purchase.save();
    res.json(purchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export purchase invoice (dummy PDF link)
// @route   GET /api/purchases/:id/invoice
// @access  Private
export const exportPurchaseInvoice = async (req, res) => {
  try {
    // TODO: Implement real PDF export
    res.json({ url: `/invoices/purchase-${req.params.id}.pdf` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 