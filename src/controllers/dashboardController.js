import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';

// Helper function to get day of week labels in Vietnamese
const getDayLabels = () => ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    // Get counts
    const customerCount = await Customer.countDocuments();
    const productCount = await Product.countDocuments();
    const orderCount = await Order.countDocuments();
    
    // Get total revenue
    const orders = await Order.find();
    const totalRevenue = orders.reduce((total, order) => total + order.totalAmount, 0);
    
    // Get orders by day of week (last 7 days)
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentOrders = await Order.find({
      orderDate: { $gte: sevenDaysAgo }
    }).sort({ orderDate: -1 });
    
    // Initialize array for each day of the week
    const ordersByDay = Array(7).fill(0);
    
    // Count orders for each day
    recentOrders.forEach(order => {
      const dayOfWeek = order.orderDate.getDay(); // 0 is Sunday, 1 is Monday, etc.
      // Adjust to make Monday index 0
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      ordersByDay[adjustedDay]++;
    });
    
    // Get revenue by product
    const orderItems = await OrderItem.find().populate('productId', 'name');
    
    // Group by product and sum revenue
    const productRevenue = {};
    orderItems.forEach(item => {
      const productName = item.productName;
      if (!productRevenue[productName]) {
        productRevenue[productName] = 0;
      }
      productRevenue[productName] += item.total;
    });
    
    // Convert to arrays for chart data
    const productLabels = Object.keys(productRevenue);
    const productData = Object.values(productRevenue);
    
    // Get recent orders for table
    const recentOrdersForTable = await Order.find()
      .sort({ orderDate: -1 })
      .limit(5)
      .select('customerName orderDate status totalAmount');
    
    res.json({
      customers: customerCount,
      products: productCount,
      orders: orderCount,
      revenue: totalRevenue,
      ordersByDay: {
        labels: getDayLabels(),
        data: ordersByDay
      },
      revenueByProduct: {
        labels: productLabels,
        data: productData
      },
      recentOrders: recentOrdersForTable
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
