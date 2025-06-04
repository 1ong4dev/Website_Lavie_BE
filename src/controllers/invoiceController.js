import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import Purchase from '../models/Purchase.js';
import PDFDocument from 'pdfkit';
import PDFTable from 'pdfkit-table';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Get daily revenue statistics
// @route   GET /api/reports/revenue/daily
// @access  Private/Admin
export const getDailyRevenue = async (req, res) => {
  try {
    const { date } = req.query;
    const queryDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      orderDate: { $gte: startOfDay, $lte: endOfDay },
      status: 'completed',
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalPaid = orders.reduce((sum, order) => sum + order.paidAmount, 0);
    const totalDebt = orders.reduce((sum, order) => sum + order.debtRemaining, 0);

    res.json({
      date: startOfDay,
      totalOrders: orders.length,
      totalRevenue,
      totalPaid,
      totalDebt,
      orders: orders.map(order => ({
        id: order._id,
        customer: order.customerName,
        total: order.totalAmount,
        paid: order.paidAmount,
        debt: order.debtRemaining,
        date: order.orderDate,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get monthly revenue statistics
// @route   GET /api/reports/revenue/monthly
// @access  Private/Admin
export const getMonthlyRevenue = async (req, res) => {
  try {
    const { year, month } = req.query;
    const queryYear = parseInt(year) || new Date().getFullYear();
    const queryMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    
    const startDate = new Date(queryYear, queryMonth, 1);
    const endDate = new Date(queryYear, queryMonth + 1, 0, 23, 59, 59, 999);

    // Get all orders for the month
    const orders = await Order.find({
      orderDate: { $gte: startDate, $lte: endDate },
      status: 'completed',
    });

    // Group orders by day
    const dailyStats = {};
    for (let d = 1; d <= endDate.getDate(); d++) {
      const day = new Date(queryYear, queryMonth, d).toISOString().split('T')[0];
      dailyStats[day] = {
        date: day,
        totalRevenue: 0,
        totalOrders: 0,
        totalPaid: 0,
        totalDebt: 0,
      };
    }

    // Calculate daily stats
    orders.forEach(order => {
      const day = new Date(order.orderDate).toISOString().split('T')[0];
      if (dailyStats[day]) {
        dailyStats[day].totalRevenue += order.totalAmount;
        dailyStats[day].totalPaid += order.paidAmount;
        dailyStats[day].totalDebt += order.debtRemaining;
        dailyStats[day].totalOrders += 1;
      }
    });

    const monthlyStats = {
      month: queryMonth + 1,
      year: queryYear,
      totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      totalOrders: orders.length,
      totalPaid: orders.reduce((sum, order) => sum + order.paidAmount, 0),
      totalDebt: orders.reduce((sum, order) => sum + order.debtRemaining, 0),
      dailyStats: Object.values(dailyStats),
    };

    res.json(monthlyStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get best selling products
// @route   GET /api/reports/products/best-selling
// @access  Private/Admin
export const getBestSellingProducts = async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;
    
    const matchStage = {};
    
    if (startDate || endDate) {
      matchStage.orderDate = {};
      if (startDate) matchStage.orderDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchStage.orderDate.$lte = end;
      }
    }

    const bestSelling = await OrderItem.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'order',
        },
      },
      { $unwind: '$order' },
      { $match: { 'order.status': 'completed' } },
      {
        $group: {
          _id: '$productId',
          productName: { $first: '$productName' },
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          productName: 1,
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: 1,
          unit: '$productDetails.unit',
          price: '$productDetails.price',
        },
      },
    ]);

    res.json(bestSelling);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate PDF invoice for an order
// @route   GET /api/invoices/:orderId
// @access  Private
export const generateInvoicePdf = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Get order details
    const order = await Order.findById(orderId)
      .populate('customerId', 'name phone address')
      .populate('createdBy', 'name');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get order items
    const items = await OrderItem.find({ orderId });

    // Create PDF document with UTF-8 support
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      info: {
        Title: `Hóa đơn - ${orderId}`,
        Author: 'W_Lavie Water',
      }
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=invoice-${orderId}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Use standard fonts with better Unicode support
    // No custom fonts needed
    
    // Add header
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('HOA DON BAN HANG', { align: 'center' })
      .moveDown();
    
    // Add invoice info
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(`Ma hoa don: ${order._id}`, { align: 'left' })
      .text(`Ngay tao: ${new Date(order.orderDate).toLocaleDateString('en-US')}`, { align: 'left' })
      .text(`Nhan vien: ${order.createdBy?.name || 'N/A'}`, { align: 'left' })
      .moveDown();
    
    // Add customer info
    doc
      .font('Helvetica-Bold')
      .text('Thong tin khach hang:', { align: 'left' })
      .font('Helvetica')
      .text(`Ten: ${order.customerName}`)
      .text(`SDT: ${order.customerId?.phone || 'N/A'}`)
      .text(`Dia chi: ${order.customerId?.address || 'N/A'}`)
      .moveDown();
    
    // Add items table
    const table = {
      headers: [
        { label: 'STT', property: 'index', width: 50, renderer: (value) => value + 1 },
        { label: 'Ten san pham', property: 'productName', width: 200 },
        { label: 'Don gia', property: 'unitPrice', width: 100, renderer: (value) => value.toLocaleString('en-US') + ' d' },
        { label: 'So luong', property: 'quantity', width: 80 },
        { label: 'Thanh tien', property: 'total', width: 120, renderer: (value) => value.toLocaleString('en-US') + ' d' },
      ],
      datas: items.map((item, index) => ({
        ...item.toObject(),
        index,
      })),
    };
    
    // Draw table
    await doc.table(table, {
      prepareHeader: () => doc.font('Helvetica-Bold'),
      prepareRow: (row, i) => doc.font('Helvetica'),
    });
    
    // Add summary
    doc.moveDown()
      .font('Helvetica-Bold')
      .text(`Tong cong: ${order.totalAmount.toLocaleString('en-US')} d`, { align: 'right' })
      .font('Helvetica')
      .text(`Da thanh toan: ${order.paidAmount.toLocaleString('en-US')} d`, { align: 'right' })
      .font('Helvetica-Bold')
      .text(`Con no: ${(order.totalAmount - order.paidAmount).toLocaleString('en-US')} d`, { align: 'right' })
      .moveDown(2)
      .font('Helvetica')
      .text('Cam on quy khach da mua hang!', { align: 'center' })
      .text('Hen gap lai!', { align: 'center' });
    
    // Finalize PDF and end response
    doc.end();
  } catch (error) {
    console.error('Error generating PDF invoice:', error);
    res.status(500).json({ message: 'Error generating PDF invoice', error: error.message });
  }
};

// @desc    Generate inventory report PDF
// @route   GET /api/reports/inventory/export
// @access  Private/Admin
export const exportInventoryReport = async (req, res) => {
  try {
    // Get all products with stock info
    const { startDate, endDate, token } = req.query;
    
    // Check token if provided in query params
    if (token && req.headers.authorization === undefined) {
      req.headers.authorization = `Bearer ${token}`;
    }
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1)); // First day of current month
    const end = endDate ? new Date(endDate) : new Date();
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
        totalDebt: customer.debt,
        lastOrderDate: lastOrder ? lastOrder.orderDate : null,
        pendingOrders: pendingOrdersCount
      };
    }));

    // Create PDF document with better styling
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true
    });

    // Register fonts
    const fontPath = path.join(__dirname, '../assets/fonts/Roboto-Regular.ttf');
    const fontBoldPath = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');
    const fontLightPath = path.join(__dirname, '../assets/fonts/Roboto-Light.ttf');
    doc.registerFont('Roboto', fontPath);
    doc.registerFont('Roboto-Bold', fontBoldPath);
    doc.registerFont('Roboto-Light', fontLightPath);

    // Helper function to add page numbers
    const addPageNumbers = () => {
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.font('Roboto-Light')
           .fontSize(8)
           .text(
             `Trang ${i + 1}/${pages.count}`,
             0,
             doc.page.height - 20,
             { align: 'center' }
           );
      }
    };
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=customer-debt-report.pdf');
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add styled header
    doc
      .font('Roboto-Bold')
      .fontSize(22)
      .fillColor('#2F5597')
      .text('W_LAVIE', { align: 'center' })
      .moveDown(0.3)
      .fontSize(10)
      .fillColor('#666666')
      .text('CÔNG TY TNHH THƯƠNG MẠI W_LAVIE', { align: 'center' })
      .moveDown(0.2)
      .font('Roboto-Light')
      .text('123 Đường ABC, Phường XYZ, Quận 123, TP.HCM', { align: 'center' })
      .text('Điện thoại: 0123.456.789 - Email: contact@wlavie.com', { align: 'center' })
      .moveDown(1.5)
      .font('Roboto-Bold')
      .fontSize(18)
      .fillColor('#2F5597')
      .text('BÁO CÁO CÔNG NỢ KHÁCH HÀNG', { align: 'center' })
      .moveDown(0.5)
      .font('Roboto')
      .fontSize(11)
      .fillColor('#000000')
      .text(
        `Kỳ báo cáo: ${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}\n` +
        `Ngày lập: ${new Date().toLocaleDateString('vi-VN')}`, 
        { align: 'center' }
      )
      .moveDown(1);
    
    // Add styled summary boxes
    const boxWidth = 250;
    const boxHeight = 60;
    const startX = 50;
    const startY = doc.y;
    const boxGap = 20;

    // Helper function to draw summary box
    const drawSummaryBox = (x, y, title, value, color) => {
      doc.save()
         .roundedRect(x, y, boxWidth, boxHeight, 5)
         .fillAndStroke(color, '#FFFFFF');
      
      doc.fill('#FFFFFF')
         .font('Roboto-Light')
         .fontSize(10)
         .text(title, x + 10, y + 10);
      
      doc.font('Roboto-Bold')
         .fontSize(16)
         .text(value, x + 10, y + 30);
      
      doc.restore();
    };

    // Draw summary boxes
    drawSummaryBox(startX, startY, 'TỔNG CÔNG NỢ', 
      totalDebt.toLocaleString('vi-VN') + ' đ', '#2F5597');
    drawSummaryBox(startX + boxWidth + boxGap, startY, 'KHÁCH HÀNG CÓ CÔNG NỢ', 
      customersWithDebt.length.toString(), '#1F8756');
    
    doc.y = startY + boxHeight + 20; // Move down after boxes

    // Additional summary box for pending orders
    drawSummaryBox(startX, doc.y, 'ĐƠN HÀNG CHƯA THANH TOÁN', 
      pendingOrders.length.toString(), '#C45911');
    
    doc.y += boxHeight + 30; // Move down after all boxes
    
    // Add customer debt table
    const table = {
      headers: [
        { label: 'STT', property: 'index', width: 30, renderer: (value) => value + 1 },
        { label: 'Khách hàng', property: 'customerName', width: 150 },
        { label: 'Số điện thoại', property: 'customerPhone', width: 100 },
        { label: 'Công nợ', property: 'totalDebt', width: 100, renderer: (value) => value.toLocaleString('vi-VN') + ' đ' },
        { label: 'Đơn chưa TT', property: 'pendingOrders', width: 70 },
        { label: 'Đơn hàng gần nhất', property: 'lastOrderDate', width: 100, renderer: (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'N/A' },
      ],
      datas: customerDebts.map((customer, index) => ({
        ...customer,
        index,
      })),
    };
    
    // Draw table
    await doc.table(table, {
      prepareHeader: () => doc.font('Helvetica-Bold'),
      prepareRow: (row, i) => doc.font('Helvetica'),
    });
    
    // Add total
    doc.moveDown()
       .font('Helvetica-Bold')
       .text(`Tổng công nợ: ${totalDebt.toLocaleString('vi-VN')} đ`, { align: 'right' });
    
    // Finalize PDF and end response
    doc.end();
  } catch (error) {
    console.error('Error generating customer debt report:', error);
    res.status(500).json({ message: 'Error generating customer debt report', error: error.message });
  }
};

// @desc    Generate supplier debt report PDF
// @route   GET /api/reports/supplier-debt/export
// @access  Private/Admin
export const exportRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate, token } = req.query;
    
    // Check token if provided in query params
    if (token && req.headers.authorization === undefined) {
      req.headers.authorization = `Bearer ${token}`;
    }
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1)); // First day of current month
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Get all completed orders within date range
    const orders = await Order.find({
      orderDate: { $gte: start, $lte: end },
      status: 'completed'
    }).populate('customerId');

    // Calculate revenue statistics
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalPaid = orders.reduce((sum, order) => sum + order.paidAmount, 0);
    const totalDebt = orders.reduce((sum, order) => sum + order.debtRemaining, 0);
    const totalOrders = orders.length;

    // Group orders by day
    const dailyStats = {};
    orders.forEach(order => {
      const day = new Date(order.orderDate).toISOString().split('T')[0];
      if (!dailyStats[day]) {
        dailyStats[day] = {
          date: day,
          totalRevenue: 0,
          totalOrders: 0,
          totalPaid: 0,
          totalDebt: 0
        };
      }
      dailyStats[day].totalRevenue += order.totalAmount;
      dailyStats[day].totalPaid += order.paidAmount;
      dailyStats[day].totalDebt += order.debtRemaining;
      dailyStats[day].totalOrders += 1;
    });

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true
    });

    // Register fonts
    const fontPath = path.join(__dirname, '../assets/fonts/Roboto-Regular.ttf');
    const fontBoldPath = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');
    const fontLightPath = path.join(__dirname, '../assets/fonts/Roboto-Light.ttf');
    doc.registerFont('Roboto', fontPath);
    doc.registerFont('Roboto-Bold', fontBoldPath);
    doc.registerFont('Roboto-Light', fontLightPath);

    // Helper function to add page numbers
    const addPageNumbers = () => {
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.font('Roboto-Light')
           .fontSize(8)
           .text(
             `Trang ${i + 1}/${pages.count}`,
             0,
             doc.page.height - 20,
             { align: 'center' }
           );
      }
    };
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=revenue-report.pdf');
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add styled header
    doc
      .font('Roboto-Bold')
      .fontSize(22)
      .fillColor('#2F5597')
      .text('W_LAVIE', { align: 'center' })
      .moveDown(0.3)
      .fontSize(10)
      .fillColor('#666666')
      .text('CÔNG TY TNHH THƯƠNG MẠI W_LAVIE', { align: 'center' })
      .moveDown(0.2)
      .font('Roboto-Light')
      .text('123 Đường ABC, Phường XYZ, Quận 123, TP.HCM', { align: 'center' })
      .text('Điện thoại: 0123.456.789 - Email: contact@wlavie.com', { align: 'center' })
      .moveDown(1.5)
      .font('Roboto-Bold')
      .fontSize(18)
      .fillColor('#2F5597')
      .text('BÁO CÁO DOANH THU', { align: 'center' })
      .moveDown(0.5)
      .font('Roboto')
      .fontSize(11)
      .fillColor('#000000')
      .text(
        `Kỳ báo cáo: ${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}\n` +
        `Ngày lập: ${new Date().toLocaleDateString('vi-VN')}`, 
        { align: 'center' }
      )
      .moveDown(1);
    
    // Add styled summary boxes
    const boxWidth = 250;
    const boxHeight = 60;
    const startX = 50;
    const startY = doc.y;
    const boxGap = 20;

    // Helper function to draw summary box
    const drawSummaryBox = (x, y, title, value, color) => {
      doc.save()
         .roundedRect(x, y, boxWidth, boxHeight, 5)
         .fillAndStroke(color, '#FFFFFF');
      
      doc.fill('#FFFFFF')
         .font('Roboto-Light')
         .fontSize(10)
         .text(title, x + 10, y + 10);
      
      doc.font('Roboto-Bold')
         .fontSize(16)
         .text(value, x + 10, y + 30);
      
      doc.restore();
    };

    // Draw summary boxes
    drawSummaryBox(startX, startY, 'TỔNG DOANH THU', 
      totalRevenue.toLocaleString('vi-VN') + ' đ', '#2F5597');
    drawSummaryBox(startX + boxWidth + boxGap, startY, 'TỔNG ĐƠN HÀNG', 
      totalOrders.toString(), '#1F8756');
    
    doc.y = startY + boxHeight + 20; // Move down after boxes

    // Additional summary boxes
    drawSummaryBox(startX, doc.y, 'ĐÃ THANH TOÁN', 
      totalPaid.toLocaleString('vi-VN') + ' đ', '#1F8756');
    drawSummaryBox(startX + boxWidth + boxGap, doc.y, 'CÔNG NỢ', 
      totalDebt.toLocaleString('vi-VN') + ' đ', '#C45911');
    
    doc.y += boxHeight + 30; // Move down after all boxes
    
    // Add daily revenue table
    doc.font('Roboto-Bold')
       .fontSize(12)
       .fillColor('#2F5597')
       .text('CHI TIẾT DOANH THU THEO NGÀY', { align: 'left' })
       .moveDown(0.5);

    const table = {
      headers: [
        { label: 'STT', property: 'index', width: 30, renderer: (value) => value + 1 },
        { label: 'Ngày', property: 'date', width: 100, renderer: (value) => new Date(value).toLocaleDateString('vi-VN') },
        { label: 'Doanh thu', property: 'totalRevenue', width: 120, renderer: (value) => value.toLocaleString('vi-VN') + ' đ' },
        { label: 'Đã thanh toán', property: 'totalPaid', width: 120, renderer: (value) => value.toLocaleString('vi-VN') + ' đ' },
        { label: 'Công nợ', property: 'totalDebt', width: 120, renderer: (value) => value.toLocaleString('vi-VN') + ' đ' },
        { label: 'Số đơn hàng', property: 'totalOrders', width: 60 },
      ],
      datas: Object.values(dailyStats).map((day, index) => ({
        ...day,
        index,
      })),
    };
    
    // Draw styled table
    await doc.table(table, {
      width: doc.page.width - 100,
      prepareHeader: () => doc.font('Roboto-Bold').fontSize(10).fillColor('#FFFFFF'),
      prepareRow: (row, i) => {
        doc.font('Roboto').fontSize(10).fillColor('#000000');
        return i % 2 === 0 ? '#F5F5F5' : '#FFFFFF';
      },
      padding: 8,
      columnSpacing: 10,
      headerColor: '#2F5597'
    });
    
    // Add styled footer with total
    doc.moveDown(2)
       .font('Roboto-Bold')
       .fontSize(12)
       .fillColor('#2F5597')
       .text(`TỔNG DOANH THU: ${totalRevenue.toLocaleString('vi-VN')} đ`, { align: 'right' })
       .moveDown(2);

    // Add signature section
    const signatureY = doc.y;
    doc.font('Roboto-Light')
       .fontSize(11)
       .fillColor('#666666')
       .text('Người lập báo cáo', signatureY, null, { align: 'left' })
       .text('Kế toán trưởng', signatureY, null, { align: 'center' })
       .text('Giám đốc', signatureY, null, { align: 'right' })
       .moveDown(3)
       .font('Roboto-Light')
       .fontSize(10)
       .text('(Ký, ghi rõ họ tên)', doc.x, null, { align: 'left' })
       .text('(Ký, ghi rõ họ tên)', doc.x + doc.page.width/3, doc.y - 12)
       .text('(Ký, đóng dấu)', doc.x + doc.page.width*2/3, doc.y - 12);

    // Add page numbers
    addPageNumbers();
    
    // Finalize PDF and end response
    doc.end();
  } catch (error) {
    console.error('Error generating revenue report:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error generating revenue report', error: error.message });
    }
  }
};

export const exportCustomerDebtReport = async (req, res) => {
  try {
    const { startDate, endDate, token } = req.query;
    
    // Check token if provided in query params
    if (token && req.headers.authorization === undefined) {
      req.headers.authorization = `Bearer ${token}`;
    }
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1)); // First day of current month
    const end = endDate ? new Date(endDate) : new Date();
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
        totalDebt: customer.debt,
        lastOrderDate: lastOrder ? lastOrder.orderDate : null,
        pendingOrders: pendingOrdersCount
      };
    }));

    // Create PDF document with better styling
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true
    });

    // Register fonts
    const fontPath = path.join(__dirname, '../assets/fonts/Roboto-Regular.ttf');
    const fontBoldPath = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');
    const fontLightPath = path.join(__dirname, '../assets/fonts/Roboto-Light.ttf');
    doc.registerFont('Roboto', fontPath);
    doc.registerFont('Roboto-Bold', fontBoldPath);
    doc.registerFont('Roboto-Light', fontLightPath);

    // Helper function to add page numbers
    const addPageNumbers = () => {
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.font('Roboto-Light')
           .fontSize(8)
           .text(
             `Trang ${i + 1}/${pages.count}`,
             0,
             doc.page.height - 20,
             { align: 'center' }
           );
      }
    };
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=customer-debt-report.pdf');
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add styled header
    doc
      .font('Roboto-Bold')
      .fontSize(22)
      .fillColor('#2F5597')
      .text('W_LAVIE', { align: 'center' })
      .moveDown(0.3)
      .fontSize(10)
      .fillColor('#666666')
      .text('CÔNG TY TNHH THƯƠNG MẠI W_LAVIE', { align: 'center' })
      .moveDown(0.2)
      .font('Roboto-Light')
      .text('123 Đường ABC, Phường XYZ, Quận 123, TP.HCM', { align: 'center' })
      .text('Điện thoại: 0123.456.789 - Email: contact@wlavie.com', { align: 'center' })
      .moveDown(1.5)
      .font('Roboto-Bold')
      .fontSize(18)
      .fillColor('#2F5597')
      .text('BÁO CÁO CÔNG NỢ KHÁCH HÀNG', { align: 'center' })
      .moveDown(0.5)
      .font('Roboto')
      .fontSize(11)
      .fillColor('#000000')
      .text(
        `Kỳ báo cáo: ${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}\n` +
        `Ngày lập: ${new Date().toLocaleDateString('vi-VN')}`, 
        { align: 'center' }
      )
      .moveDown(1);
    
    // Add styled summary boxes
    const boxWidth = 250;
    const boxHeight = 60;
    const startX = 50;
    const startY = doc.y;
    const boxGap = 20;

    // Helper function to draw summary box
    const drawSummaryBox = (x, y, title, value, color) => {
      doc.save()
         .roundedRect(x, y, boxWidth, boxHeight, 5)
         .fillAndStroke(color, '#FFFFFF');
      
      doc.fill('#FFFFFF')
         .font('Roboto-Light')
         .fontSize(10)
         .text(title, x + 10, y + 10);
      
      doc.font('Roboto-Bold')
         .fontSize(16)
         .text(value, x + 10, y + 30);
      
      doc.restore();
    };

    // Draw summary boxes
    drawSummaryBox(startX, startY, 'TỔNG CÔNG NỢ', 
      totalDebt.toLocaleString('vi-VN') + ' đ', '#2F5597');
    drawSummaryBox(startX + boxWidth + boxGap, startY, 'KHÁCH HÀNG CÓ CÔNG NỢ', 
      customersWithDebt.length.toString(), '#1F8756');
    
    doc.y = startY + boxHeight + 20; // Move down after boxes

    // Additional summary box for pending orders
    drawSummaryBox(startX, doc.y, 'ĐƠN HÀNG CHƯA THANH TOÁN', 
      pendingOrders.length.toString(), '#C45911');
    
    doc.y += boxHeight + 30; // Move down after all boxes
    
    // Add styled customer debt table
    doc.font('Roboto-Bold')
       .fontSize(12)
       .fillColor('#2F5597')
       .text('CHI TIẾT CÔNG NỢ THEO KHÁCH HÀNG', { align: 'left' })
       .moveDown(0.5);

    const table = {
      headers: [
        { label: 'STT', property: 'index', width: 30, renderer: (value) => value + 1 },
        { label: 'Khách hàng', property: 'customerName', width: 150 },
        { label: 'Số điện thoại', property: 'customerPhone', width: 100 },
        { label: 'Công nợ', property: 'totalDebt', width: 100, renderer: (value) => value.toLocaleString('vi-VN') + ' đ' },
        { label: 'Đơn hàng chưa TT', property: 'pendingOrders', width: 70 },
        { label: 'Mua hàng gần nhất', property: 'lastOrderDate', width: 100, renderer: (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'N/A' },
      ],
      datas: customerDebts.map((customer, index) => ({
        ...customer,
        index,
      })),
    };
    
    // Draw styled table
    await doc.table(table, {
      width: doc.page.width - 100,
      prepareHeader: () => doc.font('Roboto-Bold').fontSize(10).fillColor('#FFFFFF'),
      prepareRow: (row, i) => {
        doc.font('Roboto').fontSize(10).fillColor('#000000');
        return i % 2 === 0 ? '#F5F5F5' : '#FFFFFF';
      },
      padding: 8,
      columnSpacing: 10,
      headerColor: '#2F5597'
    });
    
    // Add styled footer with total and signature
    doc.moveDown(2)
       .font('Roboto-Bold')
       .fontSize(12)
       .fillColor('#2F5597')
       .text(`TỔNG CÔNG NỢ: ${totalDebt.toLocaleString('vi-VN')} đ`, { align: 'right' })
       .moveDown(2);

    // Add signature section
    const signatureY = doc.y;
    doc.font('Roboto-Light')
       .fontSize(11)
       .fillColor('#666666')
       .text('Người lập báo cáo', signatureY, null, { align: 'left' })
       .text('Kế toán trưởng', signatureY, null, { align: 'center' })
       .text('Giám đốc', signatureY, null, { align: 'right' })
       .moveDown(3)
       .font('Roboto-Light')
       .fontSize(10)
       .text('(Ký, ghi rõ họ tên)', doc.x, null, { align: 'left' })
       .text('(Ký, ghi rõ họ tên)', doc.x + doc.page.width/3, doc.y - 12)
       .text('(Ký, đóng dấu)', doc.x + doc.page.width*2/3, doc.y - 12);

    // Add page numbers
    addPageNumbers();
    
    // Finalize PDF and end response
    doc.end();
  } catch (error) {
    console.error('Error generating customer debt report:', error);
    res.status(500).json({ message: 'Error generating customer debt report', error: error.message });
  }
};

export const exportSupplierDebtReport = async (req, res) => {
  try {
    const { startDate, endDate, token } = req.query;
    
    // Check token if provided in query params
    if (token && req.headers.authorization === undefined) {
      req.headers.authorization = `Bearer ${token}`;
    }
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1)); // First day of current month
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Get all suppliers with debt
    const suppliersWithDebt = await Supplier.find({ debt: { $gt: 0 } }).sort({ debt: -1 });
    
    // Get total debt
    const totalDebt = suppliersWithDebt.reduce((total, supplier) => total + supplier.debt, 0);
    
    // Get all purchases with debt remaining within date range
    const pendingPayments = await Purchase.find({
      purchaseDate: { $gte: start, $lte: end },
      debtRemaining: { $gt: 0 }
    }).populate('supplierId');

    // Prepare supplier debts with details
    const supplierDebts = await Promise.all(suppliersWithDebt.map(async (supplier) => {
      // Find last purchase date for this supplier
      const lastPurchase = await Purchase.findOne({ 
        supplierId: supplier._id 
      }).sort({ purchaseDate: -1 });

      // Count pending payments for this supplier
      const pendingPaymentsCount = await Purchase.countDocuments({ 
        supplierId: supplier._id,
        debtRemaining: { $gt: 0 }
      });

      return {
        supplierId: supplier._id,
        supplierName: supplier.name,
        supplierPhone: supplier.phone,
        totalDebt: supplier.debt,
        lastPurchaseDate: lastPurchase ? lastPurchase.purchaseDate : null,
        pendingPayments: pendingPaymentsCount
      };
    }));

    // Create PDF document with better styling
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true
    });

    // Register fonts
    const fontPath = path.join(__dirname, '../assets/fonts/Roboto-Regular.ttf');
    const fontBoldPath = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');
    const fontLightPath = path.join(__dirname, '../assets/fonts/Roboto-Light.ttf');
    doc.registerFont('Roboto', fontPath);
    doc.registerFont('Roboto-Bold', fontBoldPath);
    doc.registerFont('Roboto-Light', fontLightPath);

    // Helper function to add page numbers
    const addPageNumbers = () => {
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.font('Roboto-Light')
           .fontSize(8)
           .text(
             `Trang ${i + 1}/${pages.count}`,
             0,
             doc.page.height - 20,
             { align: 'center' }
           );
      }
    };
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=supplier-debt-report.pdf');
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Add styled header
    doc
      .font('Roboto-Bold')
      .fontSize(22)
      .fillColor('#2F5597')
      .text('W_LAVIE', { align: 'center' })
      .moveDown(0.3)
      .fontSize(10)
      .fillColor('#666666')
      .text('CÔNG TY TNHH THƯƠNG MẠI W_LAVIE', { align: 'center' })
      .moveDown(0.2)
      .font('Roboto-Light')
      .text('123 Đường ABC, Phường XYZ, Quận 123, TP.HCM', { align: 'center' })
      .text('Điện thoại: 0123.456.789 - Email: contact@wlavie.com', { align: 'center' })
      .moveDown(1.5)
      .font('Roboto-Bold')
      .fontSize(18)
      .fillColor('#2F5597')
      .text('BÁO CÁO CÔNG NỢ NHÀ CUNG CẤP', { align: 'center' })
      .moveDown(0.5)
      .font('Roboto')
      .fontSize(11)
      .fillColor('#000000')
      .text(
        `Kỳ báo cáo: ${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}\n` +
        `Ngày lập: ${new Date().toLocaleDateString('vi-VN')}`, 
        { align: 'center' }
      )
      .moveDown(1);
    
    // Add styled summary boxes
    const boxWidth = 250;
    const boxHeight = 60;
    const startX = 50;
    const startY = doc.y;
    const boxGap = 20;

    // Helper function to draw summary box
    const drawSummaryBox = (x, y, title, value, color) => {
      doc.save()
         .roundedRect(x, y, boxWidth, boxHeight, 5)
         .fillAndStroke(color, '#FFFFFF');
      
      doc.fill('#FFFFFF')
         .font('Roboto-Light')
         .fontSize(10)
         .text(title, x + 10, y + 10);
      
      doc.font('Roboto-Bold')
         .fontSize(16)
         .text(value, x + 10, y + 30);
      
      doc.restore();
    };

    // Draw summary boxes
    drawSummaryBox(startX, startY, 'TỔNG CÔNG NỢ', 
      totalDebt.toLocaleString('vi-VN') + ' đ', '#2F5597');
    drawSummaryBox(startX + boxWidth + boxGap, startY, 'NHÀ CUNG CẤP CÓ CÔNG NỢ', 
      suppliersWithDebt.length.toString(), '#1F8756');
    
    doc.y = startY + boxHeight + 20; // Move down after boxes

    // Additional summary box for pending payments
    drawSummaryBox(startX, doc.y, 'GIAO DỊCH CHƯA THANH TOÁN', 
      pendingPayments.length.toString(), '#C45911');
    
    doc.y += boxHeight + 30; // Move down after all boxes
    
    // Add styled supplier debt table
    doc.font('Roboto-Bold')
       .fontSize(12)
       .fillColor('#2F5597')
       .text('CHI TIẾT CÔNG NỢ THEO NHÀ CUNG CẤP', { align: 'left' })
       .moveDown(0.5);

    const table = {
      headers: [
        { label: 'STT', property: 'index', width: 30, renderer: (value) => value + 1 },
        { label: 'Nhà cung cấp', property: 'supplierName', width: 150 },
        { label: 'Số điện thoại', property: 'supplierPhone', width: 100 },
        { label: 'Công nợ', property: 'totalDebt', width: 100, renderer: (value) => value.toLocaleString('vi-VN') + ' đ' },
        { label: 'Giao dịch chưa TT', property: 'pendingPayments', width: 70 },
        { label: 'Mua hàng gần nhất', property: 'lastPurchaseDate', width: 100, renderer: (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'N/A' },
      ],
      datas: supplierDebts.map((supplier, index) => ({
        ...supplier,
        index,
      })),
    };
    
    // Draw styled table
    await doc.table(table, {
      width: doc.page.width - 100,
      prepareHeader: () => doc.font('Roboto-Bold').fontSize(10).fillColor('#FFFFFF'),
      prepareRow: (row, i) => {
        doc.font('Roboto').fontSize(10).fillColor('#000000');
        return i % 2 === 0 ? '#F5F5F5' : '#FFFFFF';
      },
      padding: 8,
      columnSpacing: 10,
      headerColor: '#2F5597'
    });
    
    // Add total
    doc.moveDown()
       .font('Helvetica-Bold')
       .text(`Tổng công nợ: ${totalDebt.toLocaleString('vi-VN')} đ`, { align: 'right' });
    
    // Finalize PDF and end response
    doc.end();
  } catch (error) {
    console.error('Error generating supplier debt report:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error generating supplier debt report', error: error.message });
    }
  }
};
