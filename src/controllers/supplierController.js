import mongoose from 'mongoose';
import Supplier from '../models/Supplier.js';
import Purchase from '../models/Purchase.js';

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private
export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({});
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get supplier by ID
// @route   GET /api/suppliers/:id
// @access  Private
export const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (supplier) {
      res.json(supplier);
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create supplier
// @route   POST /api/suppliers
// @access  Private/Admin
export const createSupplier = async (req, res) => {
  try {
    const { name, contact_person, phone, email, address } = req.body;
    const supplier = await Supplier.create({
      name,
      contact_person,
      phone,
      email,
      address,
    });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private/Admin
export const updateSupplier = async (req, res) => {
  try {
    const { name, contact_person, phone, email, address } = req.body;
    const supplier = await Supplier.findById(req.params.id);

    if (supplier) {
      supplier.name = name || supplier.name;
      supplier.contact_person = contact_person || supplier.contact_person;
      supplier.phone = phone || supplier.phone;
      supplier.email = email || supplier.email;
      supplier.address = address || supplier.address;

      const updatedSupplier = await supplier.save();
      res.json(updatedSupplier);
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private/Admin
export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (supplier) {
      await supplier.deleteOne();
      res.json({ message: 'Supplier removed' });
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 

export const paySupplierDebt = async (req, res) => {
  try {
    const supplierId = req.params.id;
    const { amount } = req.body;
  
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Số tiền thanh toán không hợp lệ' });
    }
  
    // Lấy tất cả các đơn hàng còn nợ của nhà cung cấp
    const purchases = await Purchase.find({
      supplierId,
      debtRemaining: { $gt: 0 },
    }).sort({ purchaseDate: 1 }); // ưu tiên trả nợ đơn hàng cũ hơn
  
    if (!purchases.length) {
      return res.status(404).json({ message: 'Không có công nợ cho nhà cung cấp này' });
    }
  
    let remainingAmount = amount;
  
    for (const purchase of purchases) {
      if (remainingAmount <= 0) break;
  
      const debt = purchase.debtRemaining;
      const pay = Math.min(debt, remainingAmount);
  
      purchase.paidAmount += pay;
      purchase.debtRemaining -= pay;
  
      // Cập nhật trạng thái
      if (purchase.debtRemaining === 0) {
        purchase.status = 'completed'; // Thanh toán xong
      } else {
        purchase.status = 'pending';   // Vẫn còn nợ
      }
  
      await purchase.save();
  
      remainingAmount -= pay;
    }
  
    if (remainingAmount > 0) {
      return res.status(400).json({ message: 'Số tiền thanh toán vượt quá công nợ hiện tại' });
    }
  
    res.json({ message: 'Thanh toán công nợ cho nhà cung cấp thành công' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
  
};