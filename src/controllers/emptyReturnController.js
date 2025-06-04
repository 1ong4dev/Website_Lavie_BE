import EmptyReturn from '../models/EmptyReturn.js';
import Customer from '../models/Customer.js';

// @desc    Get all empty returns
// @route   GET /api/returns
// @access  Private
export const getEmptyReturns = async (req, res) => {
  try {
    const returns = await EmptyReturn.find({})
      .sort({ date: -1 })
      .populate('customerId', 'name')
      .populate('orderId', 'orderDate');
    
    res.json(returns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get empty return by ID
// @route   GET /api/returns/:id
// @access  Private
export const getEmptyReturnById = async (req, res) => {
  try {
    const emptyReturn = await EmptyReturn.findById(req.params.id)
      .populate('customerId', 'name')
      .populate('orderId', 'orderDate');
    
    if (emptyReturn) {
      res.json(emptyReturn);
    } else {
      res.status(404).json({ message: 'Empty return record not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create empty return
// @route   POST /api/returns
// @access  Private/Sales
export const createEmptyReturn = async (req, res) => {
  try {
    const { customerId, orderId, delivered, returned, note } = req.body;

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Create empty return record
    const emptyReturn = await EmptyReturn.create({
      customerId,
      orderId,
      delivered,
      returned,
      note,
    });

    // Update customer empty_debt
    if (delivered > 0) {
      customer.empty_debt += delivered;
    }
    
    if (returned > 0) {
      customer.empty_debt -= returned;
    }
    
    await customer.save();

    res.status(201).json(emptyReturn);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get empty returns by customer
// @route   GET /api/returns/customer/:id
// @access  Private
export const getEmptyReturnsByCustomer = async (req, res) => {
  try {
    const returns = await EmptyReturn.find({ customerId: req.params.id })
      .sort({ date: -1 })
      .populate('orderId', 'orderDate');
    
    res.json(returns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 