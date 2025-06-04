import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';
import Supplier from '../models/Supplier.js';
import Purchase from '../models/Purchase.js';
import PDFDocument from 'pdfkit';
import PDFTable from 'pdfkit-table';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to format date
export const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

// @desc    Get sales report
// @route   GET /api/reports/sales
// @access  Private/Admin
export const getSalesReport = async (req, res) => {
  try {
    // Get date parameters or default to current month
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1)); // First day of current month
    const end = endDate ? new Date(endDate) : new Date();
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    // Get all orders within date range
    const orders = await Order.find({
      orderDate: { $gte: start, $lte: end },
      status: 'completed',
    });

    // Calculate total sales, total paid, total debt
    const totalSales = orders.reduce((acc, order) => acc + order.totalAmount, 0);
    const totalPaid = orders.reduce((acc, order) => acc + order.paidAmount, 0);
    const totalDebt = orders.reduce((acc, order) => acc + order.debtRemaining, 0);
    
    // Get order count
    const orderCount = orders.length;

    // Get daily sales data
    const dailySales = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: start, $lte: end },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
          sales: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          sales: 1,
          orders: 1,
        },
      },
    ]);

    // Get top products
    const topProducts = await OrderItem.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$productId',
          quantity: { $sum: '$quantity' },
          revenue: { $sum: { $multiply: ['$price', '$quantity'] } },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: '$product.name',
          quantity: 1,
          revenue: 1,
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);

    // Get top customers
    const topCustomers = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: start, $lte: end },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: '$customerId',
          orders: { $sum: 1 },
          spend: { $sum: '$totalAmount' },
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: '$customer' },
      {
        $project: {
          _id: 0,
          customerId: '$_id',
          customerName: '$customer.name',
          orders: 1,
          spend: 1,
        },
      },
      { $sort: { spend: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      totalSales,
      totalOrders: orderCount,
      averageOrderValue: orderCount > 0 ? totalSales / orderCount : 0,
      dailySales,
      topProducts,
      topCustomers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get inventory report
// @route   GET /api/reports/inventory
// @access  Private/Admin
export const getInventoryReport = async (req, res) => {
  try {
    const products = await Product.find({});
    
    // Get low stock products (less than 10 items)
    const lowStockProducts = products.filter(product => product.stock < 10);
    
    // Get out of stock products
    const outOfStockProducts = products.filter(product => product.stock === 0);
    
    // Get total inventory value
    const totalInventoryValue = products.reduce((total, product) => {
      return total + (product.stock * product.price);
    }, 0);

    res.json({
      summary: {
        totalProducts: products.length,
        totalInventoryValue,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
      },
      lowStockProducts,
      outOfStockProducts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get debt report
// @route   GET /api/reports/debt
// @access  Private/Admin
export const getDebtReport = async (req, res) => {
  try {
    // Get all customers with debt
    const customersWithDebt = await Customer.find({ debt: { $gt: 0 } }).sort({ debt: -1 });
    
    // Get total debt
    const totalDebt = customersWithDebt.reduce((total, customer) => total + customer.debt, 0);
    
    // Get customers with empty bottle debt
    const customersWithEmptyDebt = await Customer.find({ empty_debt: { $gt: 0 } }).sort({ empty_debt: -1 });
    
    // Get total empty bottle debt
    const totalEmptyDebt = customersWithEmptyDebt.reduce((total, customer) => total + customer.empty_debt, 0);

    res.json({
      summary: {
        totalDebt,
        customersWithDebtCount: customersWithDebt.length,
        totalEmptyDebt,
        customersWithEmptyDebtCount: customersWithEmptyDebt.length,
      },
      customersWithDebt,
      customersWithEmptyDebt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get customer debt report
// @route   GET /api/reports/customer-debt
// @access  Private/Admin
export const getCustomerDebtReport = async (req, res) => {
  try {
    // Get date parameters or default to current month
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1)); // First day of current month
    const end = endDate ? new Date(endDate) : new Date();
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    // Get all customers with debt
    const customersWithDebt = await Customer.find({ debt: { $gt: 0 } }).sort({ debt: -1 });
    
    // Get total debt
    const totalDebt = customersWithDebt.reduce((total, customer) => total + customer.debt, 0);
    
    // Get all orders with debt remaining within date range
    const pendingOrders = await Order.find({
      orderDate: { $gte: start, $lte: end },
      debtRemaining: { $gt: 0 }
    }).populate('customerId');

    // Get debt by time (daily aggregation within date range)
    const debtByTime = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: start, $lte: end },
          debtRemaining: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
          amount: { $sum: '$debtRemaining' }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          amount: 1
        }
      }
    ]);

    // Prepare customer debts with details
    const customerDebts = await Promise.all(customersWithDebt.map(async (customer) => {
      // Find last order date for this customer
      const lastOrder = await Order.findOne({ 
        customerId: customer._id 
      }).sort({ orderDate: -1 });

      // Count pending orders for this customer
      const pendingOrdersCount = await Order.countDocuments({ 
        customerId: customer._id,
        debtRemaining: { $gt: 0 }
      });

      return {
        customerId: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        totalDebt: totalDebt,
        lastOrderDate: lastOrder ? lastOrder.orderDate : null,
        pendingOrders: pendingOrdersCount
      };
    }));

    res.json({
      totalDebt,
      totalCustomers: customersWithDebt.length,
      pendingOrders: pendingOrders.length,
      customerDebts,
      debtByTime
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get supplier debt report
// @route   GET /api/reports/supplier-debt
// @access  Private/Admin
export const getSupplierDebtReport = async (req, res) => {
  try {
    // Lấy các phiếu nhập hàng còn nợ
    const purchases = await Purchase.find({ debtRemaining: { $gt: 0 } }).populate('supplierId');
    // Tổng công nợ
    const totalDebt = purchases.reduce((sum, p) => sum + p.debtRemaining, 0);
    // Số nhà cung cấp còn nợ
    const supplierIds = new Set(purchases.map(p => p.supplierId?._id?.toString() || p.supplierId?.toString()));
    const totalSuppliers = supplierIds.size;
    // Số giao dịch còn nợ
    const pendingPayments = purchases.length;

    // Chi tiết công nợ từng nhà cung cấp
    const supplierMap = {};
    purchases.forEach(p => {
      const id = p.supplierId?._id?.toString() || p.supplierId?.toString();
      if (!supplierMap[id]) {
        supplierMap[id] = {
          supplierId: id,
          supplierName: p.supplierId?.name || p.supplierName,
          supplierPhone: p.supplierId?.phone || '',
          totalDebt: 0,
          lastPurchaseDate: null,
          pendingPayments: 0,
        };
      }
      supplierMap[id].totalDebt += p.debtRemaining;
      supplierMap[id].pendingPayments += 1;
      if (!supplierMap[id].lastPurchaseDate || p.purchaseDate > supplierMap[id].lastPurchaseDate) {
        supplierMap[id].lastPurchaseDate = p.purchaseDate;
      }
    });

    const supplierDebts = Object.values(supplierMap);

    // Biến động công nợ theo thời gian (nếu cần)
    const debtByTime = []; // Có thể bổ sung sau

    res.json({
      totalDebt,
      totalSuppliers,
      pendingPayments,
      supplierDebts,
      debtByTime,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/reports/dashboard
// @access  Private
export const getDashboardStats = async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get month start
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Get today's orders
    const todayOrders = await Order.find({
      orderDate: { $gte: today },
    });
    
    // Get month's orders
    const monthOrders = await Order.find({
      orderDate: { $gte: monthStart },
    });
    
    // Calculate total sales for today and month
    const todaySales = todayOrders.reduce((acc, order) => acc + order.totalAmount, 0);
    const monthSales = monthOrders.reduce((acc, order) => acc + order.totalAmount, 0);
    
    // Get customer count
    const customerCount = await Customer.countDocuments();
    
    // Get today's transactions
    const todayTransactions = await Transaction.find({
      date: { $gte: today },
    });
    
    // Calculate total payments received today
    const todayPayments = todayTransactions.reduce((acc, transaction) => acc + transaction.amount, 0);
    
    // Get low stock products (less than 10 items)
    const lowStockCount = await Product.countDocuments({ stock: { $lt: 10 } });
    
    // Get total debt
    const totalDebt = (await Customer.aggregate([{ $group: { _id: null, total: { $sum: '$debt' } } }]))[0]?.total || 0;

    res.json({
      sales: {
        today: todaySales,
        month: monthSales,
        todayOrderCount: todayOrders.length,
        monthOrderCount: monthOrders.length,
      },
      customers: {
        total: customerCount,
      },
      payments: {
        today: todayPayments,
      },
      inventory: {
        lowStockCount,
      },
      debt: {
        total: totalDebt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get financial report
// @route   GET /api/reports/financial
// @access  Private/Admin
export const getFinancialReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Lấy tất cả đơn hàng hoàn thành trong khoảng thời gian
    const orders = await Order.find({
      orderDate: { $gte: start, $lte: end },
      status: 'completed',
    });
    // Lấy tất cả transaction (chi phí) trong khoảng thời gian
    const transactions = await Transaction.find({
      date: { $gte: start, $lte: end },
    });

    // Tổng doanh thu = tổng totalAmount đơn hoàn thành
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    // Tổng chi phí = tổng amount các transaction có method là 'expense' (nếu có), nếu không thì tổng tất cả
    const totalExpenses = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    // Lợi nhuận ròng
    const netProfit = totalRevenue - totalExpenses;

    // Daily financials
    const days = {};
    orders.forEach(o => {
      const d = o.orderDate.toISOString().slice(0, 10);
      if (!days[d]) days[d] = { revenue: 0, expenses: 0, profit: 0 };
      days[d].revenue += o.totalAmount || 0;
    });
    transactions.forEach(t => {
      const d = t.date.toISOString().slice(0, 10);
      if (!days[d]) days[d] = { revenue: 0, expenses: 0, profit: 0 };
      days[d].expenses += t.amount || 0;
    });
    Object.keys(days).forEach(d => {
      days[d].profit = days[d].revenue - days[d].expenses;
    });
    const dailyFinancials = Object.keys(days).sort().map(date => ({ date, ...days[date] }));

    // Doanh thu theo danh mục (ví dụ: chỉ có 1 danh mục là Bán hàng)
    const revenueByCategory = [
      { category: 'Bán hàng', amount: totalRevenue, percentage: 100 }
    ];
    // Chi phí theo danh mục (ví dụ: chỉ có 1 danh mục là Chi phí khác)
    const expensesByCategory = [
      { category: 'Chi phí khác', amount: totalExpenses, percentage: 100 }
    ];

    res.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      dailyFinancials,
      revenueByCategory,
      expensesByCategory,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 