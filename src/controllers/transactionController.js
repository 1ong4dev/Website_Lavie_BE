import Transaction from '../models/Transaction.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private
export const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({})
      .sort({ date: -1 })
      .populate('customerId', 'name')
      .populate('orderId', 'orderDate');
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
export const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('customerId', 'name')
      .populate('orderId', 'orderDate');
    
    if (transaction) {
      res.json(transaction);
    } else {
      res.status(404).json({ message: 'Transaction not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create transaction
// @route   POST /api/transactions
// @access  Private/Admin/Sales
export const createTransaction = async (req, res) => {
  try {
    const { customerId, orderId, amount, method } = req.body;

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // If orderId provided, verify it exists
    if (orderId) {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Update order paid amount
      order.paidAmount += amount;
      await order.save();
    }

    // Create transaction
    const transaction = await Transaction.create({
      customerId,
      orderId,
      amount,
      method,
      createdBy: req.user._id,
    });

    // Update customer debt
    customer.debt -= amount;
    await customer.save();

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get transactions by customer
// @route   GET /api/transactions/customer/:id
// @access  Private
export const getTransactionsByCustomer = async (req, res) => {
  try {
    const transactions = await Transaction.find({ customerId: req.params.id })
      .sort({ date: -1 })
      .populate('orderId', 'orderDate');
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 