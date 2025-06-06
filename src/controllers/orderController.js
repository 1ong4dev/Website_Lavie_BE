import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

import Customer from '../models/Customer.js';

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get order items
// @route   GET /api/orders/:id/items
// @access  Private
export const getOrderItems = async (req, res) => {
  try {
    const orderItems = await OrderItem.find({ orderId: req.params.id });
    res.json(orderItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  try {
    // Validate request body
    if (!req.body) {
      return res.status(400).json({ message: 'Order data is required' });
    }

    let customerId, orderItems, customerName;
    // Tìm customer theo userId
    let customer;

    // Nếu là khách hàng đăng nhập (user role customer)
    if (req.user && req.user.role === 'customer') {
      customer = await Customer.findOne({ userId: req.user._id });
      customerId = customer._id;
      customerName = customer.name || '';
      if (!req.body.orderItems || !Array.isArray(req.body.orderItems)) {
        return res.status(400).json({ message: 'Order items are required and must be an array' });
      }
      orderItems = req.body.orderItems;
    } else if (req.body.customerId) {
      // Admin dashboard format
      customer = await Customer.findOne({ _id: req.body.customerId });
     
      if (!req.body.orderItems || !Array.isArray(req.body.orderItems)) {
        return res.status(400).json({ message: 'Order items are required and must be an array' });
      }
      customerId = customer._id;
      orderItems = req.body.orderItems;
      customerName = req.body.customerName || '';
    } else {
      return res.status(400).json({ message: 'Invalid order data format' });
    }
    

    // Kiểm tra customerId hợp lệ và tồn tại
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: 'Invalid customerId' });
    }
    // Khi tạo đơn hàng, chỉ cần tìm user theo _id, không cần check role
    // const user = await Customer.findById(customerId);
    // if (!user) {
    //   return res.status(404).json({ message: 'Customer (user) not found' });
    // }

    // Validate order items
    if (orderItems.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    // Calculate totals
    let totalAmount = 0;
    let returnableOut = 0;
    let returnableIn = 0;  // thêm biến này
    
    // Validate products and calculate totals
    for (const item of orderItems) {
      if (!item.productId || !item.quantity) {
        return res.status(400).json({ message: 'Each order item must have a product ID and quantity' });
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Không đủ hàng trong kho cho sản phẩm ${product.name}`, 
          details: {
            productId: product._id,
            productName: product.name,
            requestedQuantity: item.quantity,
            availableStock: product.stock
          }
        });
      }
      if (typeof product.price !== 'number' || product.price <= 0) {
        return res.status(400).json({ message: `Invalid price for product ${product.name}` });
      }
      totalAmount += product.price * item.quantity;
      if (product.is_returnable) {
        returnableOut += item.quantity;

         // Cộng giá trị returnable_quantity vào returnableIn nếu có
         returnableIn += item.returnable_quantity || 0;
      }
    }
    // const BOTTLE_RETURN_PRICE = 20000;
    // totalAmount = totalAmount - (returnableIn * BOTTLE_RETURN_PRICE);

    if(customer && customer.type === 'agency') {
      totalAmount = totalAmount * 0.9; // Giảm giá 10% cho khách hàng là đại lý
    }
    
    const returnablePrice = (returnableOut * 20000);
    totalAmount -= returnablePrice; // Trừ tiền cọc vỏ chai vào tổng tiền của đơn hàng

    // Create order
    const order = await Order.create({
      customerId,
      customerName,
      totalAmount,
      returnableOut,
      returnableAmount: returnablePrice, // Tổng tiền cọc vỏ
      returnableIn,   // thêm trường này
      status: 'pending',
      paidAmount: 0,
      createdBy: req.user ? req.user._id : null,
    });

    // Create order items and update product stock
    for (const item of orderItems) {
      const product = await Product.findById(item.productId);
      await OrderItem.create({
        orderId: order._id,
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        total: item.quantity * product.price,
      });
      // Update product stock
      product.stock -= item.quantity;
      await product.save();
    }

    // Không cập nhật user.debt, user.empty_debt nữa
    
    if (customer) {
    customer.debt += order.debtRemaining + returnablePrice;
    customer.empty_debt = (customer.empty_debt || 0) + ((order.returnableOut || 0) - (order.returnableIn || 0));
    await customer.save();
    }

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (order) {
      order.status = status;
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update returnable items
// @route   PUT /api/orders/:id/returnable
// @access  Private
export const updateReturnable = async (req, res) => {
  try {
    // FE gửi returnedQuantity
    const { returnedQuantity } = req.body;
    const order = await Order.findById(req.params.id);

    if (order) {
      // Calculate new returnable in value (adding to existing value)
      const newReturnableIn = order.returnableIn + returnedQuantity;
      
      if (newReturnableIn > order.returnableOut) {
        return res.status(400).json({ message: 'Returned quantity exceeds returnable quantity' });
      }

      const customer = await Customer.findOne({ _id: order.customerId });
      console.log('Customer:', customer);
      if (!customer) {
        return res.status(404).json({ message: 'Customer (user) not found' });
      }
      const returnablePrice = (returnedQuantity * 20000);

      // Update order returnable count
      order.returnableIn = newReturnableIn;
      // update tăng tiền thanh toán đơn hàng nếu công nợ nhiều hơn tiền vỏ, nếu ít hơn gán bằng tổng tiền (đã thanh toán hết)
      await order.save();

     
      // Update user empty debt
      customer.empty_debt -= returnedQuantity;
      customer.debt -= returnablePrice;
      
      await customer.save();

      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update payment
// @route   PUT /api/orders/:id/payment
// @access  Private
export const updatePayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const order = await Order.findById(req.params.id);

    if (order) {
      const customer = await Customer.findOne({ _id: order.customerId });
      if (!customer) {
        return res.status(404).json({ message: 'Customer (user) not found' });
      }

      // Update order payment
      order.paidAmount += amount;
      await order.save();

      // Update customer debt
      customer.debt -= amount;
      await customer.save();

      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }

};
// @desc    Delete an order
// @route   DELETE /api/orders/:id
// @access  Private
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const customer = await Customer.findOne({ _id: order.customerId });
    if (customer) {
      const returnableLeft = ((order.returnableOut || 0) - (order.returnableIn || 0));
      customer.debt -= (order.debtRemaining + order.debtRemainingReturnable);
      customer.empty_debt -= returnableLeft;
      await customer.save();
    }

    // Xóa tất cả OrderItem liên quan
    await OrderItem.deleteMany({ orderId: order._id });

    // Xóa order
    await Order.findByIdAndDelete(order._id);

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
