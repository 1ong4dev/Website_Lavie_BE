import pdfkit from 'pdfkit';
import PdfTable from 'pdfkit-table';
import path from 'path';
import { fileURLToPath } from 'url';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import Purchase from '../models/Purchase.js';
import { reporter } from '../config/jsreport.js';
import { helpers } from '../utils/templateHelpers.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fontPath = path.join(__dirname, '../assets/fonts');

// @desc    Generate PDF invoice for an order
// @route   GET /api/reports/invoice/:orderId
// @access  Private/Admin
export const generateInvoicePdf = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Get order items
    const orderItems = await OrderItem.find({ order: orderId })
      .populate('product');
    
    const templateData = {
      order: {
        ...order.toObject(),
        items: orderItems.map(item => ({
          productName: item.product.name,
          unit: item.product.unit,
          quantity: item.quantity,
          price: item.price,
          subTotal: item.quantity * item.price
        }))
      },
      fontPath,
      currentDate: new Date().toLocaleDateString('vi-VN'),
      pageNumber: '{#pageNum}'
    };
    
    // Read the template file directly
    const templatePath = path.join(__dirname, '../templates/invoiceReport.html');
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    
    const result = await reporter.render({
      template: {
        content: templateContent,
        engine: 'handlebars',
        recipe: 'chrome-pdf',
        chrome: {
          displayHeaderFooter: true,
          marginTop: '1cm',
          marginBottom: '1cm'
        },
        helpers
      },
      data: templateData
    });
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${orderId}.pdf"`,
      'Content-Length': result.content.length
    });
    
    res.send(result.content);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).json({ message: 'Error generating invoice PDF', error: error.message });
  }
};

// @desc    Generate inventory report PDF
// @route   GET /api/reports/inventory/export
// @access  Private/Admin
export const exportInventoryReport = async (req, res) => {
  try {
    // Lấy dữ liệu tồn kho
    const products = await Product.find({});
    const totalProducts = products.length;
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= (p.reorderLevel || 10));
    const outOfStockProducts = products.filter(p => p.stock === 0);
    const mostStockedProducts = products.filter(p => p.stock > 0).sort((a, b) => b.stock - a.stock).slice(0, 10);

    // Format dữ liệu
    const formatCurrency = v => new Intl.NumberFormat('vi-VN').format(v) + ' đ';
    const formatNumber = v => new Intl.NumberFormat('vi-VN').format(v);

    // Tạo HTML báo cáo
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Báo Cáo Tồn Kho</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { color: #2F5597; font-size: 22px; font-weight: bold; margin-bottom: 5px; }
        .company-details { color: #666; font-size: 10px; font-weight: 300; }
        .report-title { color: #2F5597; font-size: 18px; font-weight: bold; margin: 20px 0; text-align: center; }
        .report-period { font-size: 11px; margin-bottom: 20px; text-align: center; }
        .summary-box { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .summary-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .summary-label { font-weight: bold; }
        .section-title { color: #2F5597; font-size: 14px; font-weight: bold; margin: 20px 0 10px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table thead { background-color: #2F5597; color: white; }
        table th, table td { padding: 8px; text-align: left; font-size: 10px; border: 1px solid #ddd; }
        table tr:nth-child(even) { background-color: #f5f5f5; }
        .footer { text-align: center; margin-top: 50px; font-size: 10px; color: #666; }
        .page-number { text-align: center; font-size: 8px; color: #999; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">W_LAVIE</div>
        <div class="company-details">CÔNG TY TNHH THƯƠNG MẠI W_LAVIE</div>
        <div class="company-details">123 Đường ABC, Phường XYZ, Quận 123, TP.HCM</div>
        <div class="company-details">Điện thoại: 0123.456.789 - Email: contact@wlavie.com</div>
      </div>
      <div class="report-title">BÁO CÁO TỒN KHO</div>
      <div class="report-period">Ngày lập: ${new Date().toLocaleDateString('vi-VN')}</div>
      <div class="summary-box">
        <div class="summary-item"><div class="summary-label">TỔNG SẢN PHẨM:</div><div>${formatNumber(totalProducts)}</div></div>
        <div class="summary-item"><div class="summary-label">GIÁ TRỊ TỒN KHO:</div><div>${formatCurrency(totalInventoryValue)}</div></div>
        <div class="summary-item"><div class="summary-label">SẮP HẾT HÀNG:</div><div>${formatNumber(lowStockProducts.length)}</div></div>
        <div class="summary-item"><div class="summary-label">ĐÃ HẾT HÀNG:</div><div>${formatNumber(outOfStockProducts.length)}</div></div>
      </div>
      <div class="section-title">SẢN PHẨM SẮP HẾT HÀNG</div>
      <table><thead><tr><th>STT</th><th>Tên sản phẩm</th><th>Tồn kho</th><th>Mức cảnh báo</th><th>Đơn giá</th><th>Giá trị</th></tr></thead><tbody>
        ${lowStockProducts.map((p, i) => `<tr><td>${i+1}</td><td>${p.name}</td><td>${formatNumber(p.stock)}</td><td>${formatNumber(p.reorderLevel || 10)}</td><td>${formatCurrency(p.price)}</td><td>${formatCurrency(p.stock * p.price)}</td></tr>`).join('')}
      </tbody></table>
      <div class="section-title">SẢN PHẨM ĐÃ HẾT HÀNG</div>
      <table><thead><tr><th>STT</th><th>Tên sản phẩm</th><th>Mức cảnh báo</th><th>Đơn giá</th></tr></thead><tbody>
        ${outOfStockProducts.map((p, i) => `<tr><td>${i+1}</td><td>${p.name}</td><td>${formatNumber(p.reorderLevel || 10)}</td><td>${formatCurrency(p.price)}</td></tr>`).join('')}
      </tbody></table>
      <div class="section-title">SẢN PHẨM TỒN KHO NHIỀU NHẤT</div>
      <table><thead><tr><th>STT</th><th>Tên sản phẩm</th><th>Tồn kho</th><th>Mức cảnh báo</th><th>Đơn giá</th><th>Giá trị</th></tr></thead><tbody>
        ${mostStockedProducts.map((p, i) => `<tr><td>${i+1}</td><td>${p.name}</td><td>${formatNumber(p.stock)}</td><td>${formatNumber(p.reorderLevel || 10)}</td><td>${formatCurrency(p.price)}</td><td>${formatCurrency(p.stock * p.price)}</td></tr>`).join('')}
      </tbody></table>
      <div class="footer">© ${new Date().getFullYear()} W_LAVIE. Báo cáo được tạo tự động từ hệ thống.</div>
      <div class="page-number">Trang {#pageNum}</div>
    </body></html>
    `;
    const result = await reporter.render({
      template: {
        content: html,
        engine: 'handlebars',
        recipe: 'chrome-pdf',
        chrome: {
          displayHeaderFooter: true,
          marginTop: '1cm',
          marginBottom: '1cm'
        }
      }
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="inventory-report.pdf"`,
      'Content-Length': result.content.length
    });
    res.send(result.content);
  } catch (error) {
    console.error('Error generating inventory report PDF:', error);
    res.status(500).json({ message: 'Error generating inventory report PDF', error: error.message });
  }
};

// @desc    Generate customer debt report PDF
// @route   GET /api/reports/customer-debt/export
// @access  Private/Admin
export const exportCustomerDebtReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    const customersWithDebt = await Customer.find({ debt: { $gt: 0 } });
    const pendingOrders = await Order.countDocuments({ status: { $in: ['pending', 'processing'] }, debtRemaining: { $gt: 0 } });
    const totalDebt = customersWithDebt.reduce((sum, customer) => sum + customer.debt, 0);
    const customerDebts = await Promise.all(customersWithDebt.map(async (customer) => {
      const lastOrder = await Order.findOne({ customer: customer._id }).sort({ orderDate: -1 });
      const pendingOrderCount = await Order.countDocuments({ customer: customer._id, status: { $in: ['pending', 'processing'] }, debtRemaining: { $gt: 0 } });
      return {
        customerId: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        totalDebt: customer.debt,
        lastOrderDate: lastOrder ? lastOrder.orderDate : null,
        pendingOrders: pendingOrderCount
      };
    }));
    customerDebts.sort((a, b) => b.totalDebt - a.totalDebt);
    const formatCurrency = v => new Intl.NumberFormat('vi-VN').format(v) + ' đ';
    const formatDate = d => d ? new Date(d).toLocaleDateString('vi-VN') : '';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Báo Cáo Công Nợ Khách Hàng</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { color: #2F5597; font-size: 22px; font-weight: bold; margin-bottom: 5px; }
        .company-details { color: #666; font-size: 10px; font-weight: 300; }
        .report-title { color: #2F5597; font-size: 18px; font-weight: bold; margin: 20px 0; text-align: center; }
        .report-period { font-size: 11px; margin-bottom: 20px; text-align: center; }
        .summary-box { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .summary-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .summary-label { font-weight: bold; }
        .section-title { color: #2F5597; font-size: 14px; font-weight: bold; margin: 20px 0 10px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table thead { background-color: #2F5597; color: white; }
        table th, table td { padding: 8px; text-align: left; font-size: 10px; border: 1px solid #ddd; }
        table tr:nth-child(even) { background-color: #f5f5f5; }
        .footer { text-align: center; margin-top: 50px; font-size: 10px; color: #666; }
        .page-number { text-align: center; font-size: 8px; color: #999; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">W_LAVIE</div>
        <div class="company-details">CÔNG TY TNHH THƯƠNG MẠI W_LAVIE</div>
        <div class="company-details">123 Đường ABC, Phường XYZ, Quận 123, TP.HCM</div>
        <div class="company-details">Điện thoại: 0123.456.789 - Email: contact@wlavie.com</div>
      </div>
      <div class="report-title">BÁO CÁO CÔNG NỢ KHÁCH HÀNG</div>
      <div class="report-period">Ngày lập: ${new Date().toLocaleDateString('vi-VN')}</div>
      <div class="summary-box">
        <div class="summary-item"><div class="summary-label">TỔNG CÔNG NỢ:</div><div>${formatCurrency(totalDebt)}</div></div>
        <div class="summary-item"><div class="summary-label">KHÁCH HÀNG CÓ CÔNG NỢ:</div><div>${customerDebts.length}</div></div>
        <div class="summary-item"><div class="summary-label">ĐƠN HÀNG CHƯA THANH TOÁN:</div><div>${pendingOrders}</div></div>
      </div>
      <div class="section-title">CHI TIẾT CÔNG NỢ THEO KHÁCH HÀNG</div>
      <table><thead><tr><th>STT</th><th>Khách hàng</th><th>Số điện thoại</th><th>Công nợ</th><th>Đơn chưa TT</th><th>Mua hàng gần nhất</th></tr></thead><tbody>
        ${customerDebts.map((c, i) => `<tr><td>${i+1}</td><td>${c.customerName}</td><td>${c.customerPhone}</td><td>${formatCurrency(c.totalDebt)}</td><td>${c.pendingOrders}</td><td>${formatDate(c.lastOrderDate)}</td></tr>`).join('')}
      </tbody></table>
      <div class="footer">© ${new Date().getFullYear()} W_LAVIE. Báo cáo được tạo tự động từ hệ thống.</div>
      <div class="page-number">Trang {#pageNum}</div>
    </body></html>
    `;
    const result = await reporter.render({
      template: {
        content: html,
        engine: 'handlebars',
        recipe: 'chrome-pdf',
        chrome: {
          displayHeaderFooter: true,
          marginTop: '1cm',
          marginBottom: '1cm'
        }
      }
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="customer-debt-report.pdf"`,
      'Content-Length': result.content.length
    });
    res.send(result.content);
  } catch (error) {
    console.error('Error generating customer debt report PDF:', error);
    res.status(500).json({ message: 'Error generating customer debt report PDF', error: error.message });
  }
};

// @desc    Generate supplier debt report PDF
// @route   GET /api/reports/supplier-debt/export
// @access  Private/Admin
export const exportSupplierDebtReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    // Lấy tất cả phiếu nhập còn nợ
    const purchases = await Purchase.find({ debtRemaining: { $gt: 0 } }).populate('supplierId');
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
    const totalDebt = supplierDebts.reduce((sum, s) => sum + s.totalDebt, 0);
    const formatCurrency = v => new Intl.NumberFormat('vi-VN').format(v) + ' đ';
    const formatDate = d => d ? new Date(d).toLocaleDateString('vi-VN') : '';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Báo Cáo Công Nợ Nhà Cung Cấp</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { color: #2F5597; font-size: 22px; font-weight: bold; margin-bottom: 5px; }
        .company-details { color: #666; font-size: 10px; font-weight: 300; }
        .report-title { color: #2F5597; font-size: 18px; font-weight: bold; margin: 20px 0; text-align: center; }
        .report-period { font-size: 11px; margin-bottom: 20px; text-align: center; }
        .summary-box { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .summary-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .summary-label { font-weight: bold; }
        .section-title { color: #2F5597; font-size: 14px; font-weight: bold; margin: 20px 0 10px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table thead { background-color: #2F5597; color: white; }
        table th, table td { padding: 8px; text-align: left; font-size: 10px; border: 1px solid #ddd; }
        table tr:nth-child(even) { background-color: #f5f5f5; }
        .footer { text-align: center; margin-top: 50px; font-size: 10px; color: #666; }
        .page-number { text-align: center; font-size: 8px; color: #999; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">W_LAVIE</div>
        <div class="company-details">CÔNG TY TNHH THƯƠNG MẠI W_LAVIE</div>
        <div class="company-details">123 Đường ABC, Phường XYZ, Quận 123, TP.HCM</div>
        <div class="company-details">Điện thoại: 0123.456.789 - Email: contact@wlavie.com</div>
      </div>
      <div class="report-title">BÁO CÁO CÔNG NỢ NHÀ CUNG CẤP</div>
      <div class="report-period">Ngày lập: ${new Date().toLocaleDateString('vi-VN')}</div>
      <div class="summary-box">
        <div class="summary-item"><div class="summary-label">TỔNG CÔNG NỢ:</div><div>${formatCurrency(totalDebt)}</div></div>
        <div class="summary-item"><div class="summary-label">NHÀ CUNG CẤP CÓ CÔNG NỢ:</div><div>${supplierDebts.length}</div></div>
        <div class="summary-item"><div class="summary-label">GIAO DỊCH CHƯA THANH TOÁN:</div><div>${purchases.length}</div></div>
      </div>
      <div class="section-title">CHI TIẾT CÔNG NỢ THEO NHÀ CUNG CẤP</div>
      <table><thead><tr><th>STT</th><th>Nhà cung cấp</th><th>Số điện thoại</th><th>Công nợ</th><th>Giao dịch chưa TT</th><th>Mua hàng gần nhất</th></tr></thead><tbody>
        ${supplierDebts.map((s, i) => `<tr><td>${i+1}</td><td>${s.supplierName}</td><td>${s.supplierPhone}</td><td>${formatCurrency(s.totalDebt)}</td><td>${s.pendingPayments}</td><td>${formatDate(s.lastPurchaseDate)}</td></tr>`).join('')}
      </tbody></table>
      <div class="footer">© ${new Date().getFullYear()} W_LAVIE. Báo cáo được tạo tự động từ hệ thống.</div>
      <div class="page-number">Trang {#pageNum}</div>
    </body></html>
    `;
    const result = await reporter.render({
      template: {
        content: html,
        engine: 'handlebars',
        recipe: 'chrome-pdf',
        chrome: {
          displayHeaderFooter: true,
          marginTop: '1cm',
          marginBottom: '1cm'
        }
      }
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="supplier-debt-report.pdf"`,
      'Content-Length': result.content.length
    });
    res.send(result.content);
  } catch (error) {
    console.error('Error generating supplier debt report PDF:', error);
    res.status(500).json({ message: 'Error generating supplier debt report PDF', error: error.message });
  }
};

// @desc    Generate revenue report PDF
// @route   GET /api/reports/revenue/export
// @access  Private/Admin
export const exportRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    
    // Ensure end date includes the entire day
    end.setHours(23, 59, 59, 999);
    
    // Get orders within date range
    const orders = await Order.find({
      orderDate: { $gte: start, $lte: end },
      status: 'completed'
    });
    
    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Calculate total paid
    const totalPaid = orders.reduce((sum, order) => sum + order.paidAmount, 0);
    
    // Calculate total debt
    const totalDebt = orders.reduce((sum, order) => sum + order.debtRemaining, 0);
    
    // Group by date to get daily stats
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
    
    // Convert to array and sort by date
    const dailyStatsArray = Object.values(dailyStats).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // Pre-format các dữ liệu để tránh sử dụng helpers phức tạp
    const formattedData = {
      startDate: start.toLocaleDateString('vi-VN'),
      endDate: end.toLocaleDateString('vi-VN'),
      currentDate: new Date().toLocaleDateString('vi-VN'),
      currentYear: new Date().getFullYear(),
      totalRevenueFormatted: new Intl.NumberFormat('vi-VN').format(totalRevenue),
      totalPaidFormatted: new Intl.NumberFormat('vi-VN').format(totalPaid),
      totalDebtFormatted: new Intl.NumberFormat('vi-VN').format(totalDebt),
      totalOrders: orders.length,
      dailyData: dailyStatsArray.map((day, index) => ({
        index: index + 1,
        dateFormatted: new Date(day.date).toLocaleDateString('vi-VN'),
        totalRevenueFormatted: new Intl.NumberFormat('vi-VN').format(day.totalRevenue),
        totalPaidFormatted: new Intl.NumberFormat('vi-VN').format(day.totalPaid),
        totalDebtFormatted: new Intl.NumberFormat('vi-VN').format(day.totalDebt),
        totalOrders: day.totalOrders
      }))
    };
    
    // Tạo template HTML đơn giản hơn để tránh lỗi
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Báo Cáo Doanh Thu</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #333;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .company-name {
          color: #2F5597;
          font-size: 22px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .company-details {
          color: #666;
          font-size: 10px;
          font-weight: 300;
        }
        
        .report-title {
          color: #2F5597;
          font-size: 18px;
          font-weight: bold;
          margin: 20px 0;
          text-align: center;
        }
        
        .report-period {
          font-size: 11px;
          margin-bottom: 20px;
          text-align: center;
        }
        
        .summary-box {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        
        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        
        .summary-label {
          font-weight: bold;
        }
        
        .section-title {
          color: #2F5597;
          font-size: 14px;
          font-weight: bold;
          margin: 20px 0 10px 0;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        table thead {
          background-color: #2F5597;
          color: white;
        }
        
        table th, table td {
          padding: 8px;
          text-align: left;
          font-size: 10px;
          border: 1px solid #ddd;
        }
        
        table tr:nth-child(even) {
          background-color: #f5f5f5;
        }
        
        .footer {
          text-align: center;
          margin-top: 50px;
          font-size: 10px;
          color: #666;
        }
        
        .page-number {
          text-align: center;
          font-size: 8px;
          color: #999;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">W_LAVIE</div>
        <div class="company-details">CÔNG TY TNHH THƯƠNG MẠI W_LAVIE</div>
        <div class="company-details">123 Đường ABC, Phường XYZ, Quận 123, TP.HCM</div>
        <div class="company-details">Điện thoại: 0123.456.789 - Email: contact@wlavie.com</div>
      </div>
      
      <div class="report-title">BÁO CÁO DOANH THU</div>
      <div class="report-period">
        Kỳ báo cáo: ${formattedData.startDate} - ${formattedData.endDate}<br>
        Ngày lập: ${formattedData.currentDate}
      </div>
      
      <div class="summary-box">
        <div class="summary-item">
          <div class="summary-label">TỔNG DOANH THU:</div>
          <div>${formattedData.totalRevenueFormatted} đ</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">ĐÃ THANH TOÁN:</div>
          <div>${formattedData.totalPaidFormatted} đ</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">CÔNG NỢ:</div>
          <div>${formattedData.totalDebtFormatted} đ</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">SỐ ĐƠN HÀNG:</div>
          <div>${formattedData.totalOrders}</div>
        </div>
      </div>
      
      <div class="section-title">CHI TIẾT DOANH THU THEO NGÀY</div>
      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Ngày</th>
            <th>Doanh thu</th>
            <th>Đã thanh toán</th>
            <th>Công nợ</th>
            <th>Số đơn hàng</th>
          </tr>
        </thead>
        <tbody>
          ${formattedData.dailyData.map(day => `
            <tr>
              <td>${day.index}</td>
              <td>${day.dateFormatted}</td>
              <td>${day.totalRevenueFormatted} đ</td>
              <td>${day.totalPaidFormatted} đ</td>
              <td>${day.totalDebtFormatted} đ</td>
              <td>${day.totalOrders}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        © ${formattedData.currentYear} W_LAVIE. Báo cáo được tạo tự động từ hệ thống.
      </div>
      
      <div class="page-number">
        Trang {#pageNum}
      </div>
    </body>
    </html>
    `;
    
    const result = await reporter.render({
      template: {
        content: html,
        engine: 'handlebars',
        recipe: 'chrome-pdf',
        chrome: {
          displayHeaderFooter: true,
          marginTop: '1cm',
          marginBottom: '1cm'
        }
      }
    });
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="revenue-report.pdf"`,
      'Content-Length': result.content.length
    });
    
    res.send(result.content);
  } catch (error) {
    console.error('Error generating revenue report PDF:', error);
    res.status(500).json({ message: 'Error generating revenue report PDF', error: error.message });
  }
};

// @desc    Generate sales report PDF
// @route   GET /api/reports/sales/export
// @access  Private/Admin
export const exportSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    // Lấy dữ liệu bán hàng
    const orders = await Order.find({ orderDate: { $gte: start, $lte: end }, status: 'completed' });
    const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    // Daily sales
    const dailySales = {};
    orders.forEach(o => {
      const d = o.orderDate.toISOString().slice(0, 10);
      if (!dailySales[d]) dailySales[d] = { date: d, sales: 0, orders: 0 };
      dailySales[d].sales += o.totalAmount || 0;
      dailySales[d].orders += 1;
    });
    const dailySalesArr = Object.values(dailySales).sort((a, b) => new Date(a.date) - new Date(b.date));
    // Top products
    const topProducts = await OrderItem.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$product', quantity: { $sum: '$quantity' }, revenue: { $sum: { $multiply: ['$price', '$quantity'] } } } },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: { _id: 0, productId: '$_id', productName: '$product.name', quantity: 1, revenue: 1 } },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]);
    // Top customers
    const topCustomers = await Order.aggregate([
      { $match: { orderDate: { $gte: start, $lte: end }, status: 'completed' } },
      { $group: { _id: '$customerId', orders: { $sum: 1 }, spend: { $sum: '$totalAmount' } } },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
      { $unwind: '$customer' },
      { $project: { _id: 0, customerId: '$_id', customerName: '$customer.name', orders: 1, spend: 1 } },
      { $sort: { spend: -1 } },
      { $limit: 5 }
    ]);
    // Format
    const formatCurrency = v => new Intl.NumberFormat('vi-VN').format(v) + ' đ';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Báo Cáo Bán Hàng</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { color: #2F5597; font-size: 22px; font-weight: bold; margin-bottom: 5px; }
        .company-details { color: #666; font-size: 10px; font-weight: 300; }
        .report-title { color: #2F5597; font-size: 18px; font-weight: bold; margin: 20px 0; text-align: center; }
        .report-period { font-size: 11px; margin-bottom: 20px; text-align: center; }
        .summary-box { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .summary-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .summary-label { font-weight: bold; }
        .section-title { color: #2F5597; font-size: 14px; font-weight: bold; margin: 20px 0 10px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table thead { background-color: #2F5597; color: white; }
        table th, table td { padding: 8px; text-align: left; font-size: 10px; border: 1px solid #ddd; }
        table tr:nth-child(even) { background-color: #f5f5f5; }
        .footer { text-align: center; margin-top: 50px; font-size: 10px; color: #666; }
        .page-number { text-align: center; font-size: 8px; color: #999; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">W_LAVIE</div>
        <div class="company-details">CÔNG TY TNHH THƯƠNG MẠI W_LAVIE</div>
        <div class="company-details">123 Đường ABC, Phường XYZ, Quận 123, TP.HCM</div>
        <div class="company-details">Điện thoại: 0123.456.789 - Email: contact@wlavie.com</div>
      </div>
      <div class="report-title">BÁO CÁO BÁN HÀNG</div>
      <div class="report-period">Kỳ báo cáo: ${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}<br>Ngày lập: ${new Date().toLocaleDateString('vi-VN')}</div>
      <div class="summary-box">
        <div class="summary-item"><div class="summary-label">TỔNG DOANH THU:</div><div>${formatCurrency(totalSales)}</div></div>
        <div class="summary-item"><div class="summary-label">SỐ ĐƠN HÀNG:</div><div>${totalOrders}</div></div>
        <div class="summary-item"><div class="summary-label">GIÁ TRỊ ĐƠN TB:</div><div>${formatCurrency(averageOrderValue)}</div></div>
      </div>
      <div class="section-title">DOANH THU THEO NGÀY</div>
      <table><thead><tr><th>STT</th><th>Ngày</th><th>Doanh thu</th><th>Số đơn hàng</th></tr></thead><tbody>
        ${dailySalesArr.map((d, i) => `<tr><td>${i+1}</td><td>${d.date}</td><td>${formatCurrency(d.sales)}</td><td>${d.orders}</td></tr>`).join('')}
      </tbody></table>
      <div class="section-title">TOP 5 SẢN PHẨM BÁN CHẠY</div>
      <table><thead><tr><th>STT</th><th>Sản phẩm</th><th>Số lượng</th><th>Doanh thu</th></tr></thead><tbody>
        ${topProducts.map((p, i) => `<tr><td>${i+1}</td><td>${p.productName}</td><td>${p.quantity}</td><td>${formatCurrency(p.revenue)}</td></tr>`).join('')}
      </tbody></table>
      <div class="section-title">TOP 5 KHÁCH HÀNG</div>
      <table><thead><tr><th>STT</th><th>Khách hàng</th><th>Số đơn</th><th>Chi tiêu</th></tr></thead><tbody>
        ${topCustomers.map((c, i) => `<tr><td>${i+1}</td><td>${c.customerName}</td><td>${c.orders}</td><td>${formatCurrency(c.spend)}</td></tr>`).join('')}
      </tbody></table>
      <div class="footer">© ${new Date().getFullYear()} W_LAVIE. Báo cáo được tạo tự động từ hệ thống.</div>
      <div class="page-number">Trang {#pageNum}</div>
    </body></html>
    `;
    const result = await reporter.render({
      template: {
        content: html,
        engine: 'handlebars',
        recipe: 'chrome-pdf',
        chrome: {
          displayHeaderFooter: true,
          marginTop: '1cm',
          marginBottom: '1cm'
        }
      }
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="sales-report.pdf"`,
      'Content-Length': result.content.length
    });
    res.send(result.content);
  } catch (error) {
    console.error('Error generating sales report PDF:', error);
    res.status(500).json({ message: 'Error generating sales report PDF', error: error.message });
  }
};

// @desc    Generate financial report PDF
// @route   GET /api/reports/financial/export
// @access  Private/Admin
export const exportFinancialReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    // Lấy dữ liệu tài chính
    const orders = await Order.find({ orderDate: { $gte: start, $lte: end }, status: 'completed' });
    const transactions = await (await import('../models/Transaction.js')).default.find({ date: { $gte: start, $lte: end } });
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalExpenses = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
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
    // Doanh thu theo danh mục
    const revenueByCategory = [ { category: 'Bán hàng', amount: totalRevenue, percentage: 100 } ];
    const expensesByCategory = [ { category: 'Chi phí khác', amount: totalExpenses, percentage: 100 } ];
    // Format
    const formatCurrency = v => new Intl.NumberFormat('vi-VN').format(v) + ' đ';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Báo Cáo Tài Chính</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { color: #2F5597; font-size: 22px; font-weight: bold; margin-bottom: 5px; }
        .company-details { color: #666; font-size: 10px; font-weight: 300; }
        .report-title { color: #2F5597; font-size: 18px; font-weight: bold; margin: 20px 0; text-align: center; }
        .report-period { font-size: 11px; margin-bottom: 20px; text-align: center; }
        .summary-box { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .summary-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .summary-label { font-weight: bold; }
        .section-title { color: #2F5597; font-size: 14px; font-weight: bold; margin: 20px 0 10px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table thead { background-color: #2F5597; color: white; }
        table th, table td { padding: 8px; text-align: left; font-size: 10px; border: 1px solid #ddd; }
        table tr:nth-child(even) { background-color: #f5f5f5; }
        .footer { text-align: center; margin-top: 50px; font-size: 10px; color: #666; }
        .page-number { text-align: center; font-size: 8px; color: #999; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">W_LAVIE</div>
        <div class="company-details">CÔNG TY TNHH THƯƠNG MẠI W_LAVIE</div>
        <div class="company-details">123 Đường ABC, Phường XYZ, Quận 123, TP.HCM</div>
        <div class="company-details">Điện thoại: 0123.456.789 - Email: contact@wlavie.com</div>
      </div>
      <div class="report-title">BÁO CÁO TÀI CHÍNH</div>
      <div class="report-period">Kỳ báo cáo: ${start.toLocaleDateString('vi-VN')} - ${end.toLocaleDateString('vi-VN')}<br>Ngày lập: ${new Date().toLocaleDateString('vi-VN')}</div>
      <div class="summary-box">
        <div class="summary-item"><div class="summary-label">TỔNG DOANH THU:</div><div>${formatCurrency(totalRevenue)}</div></div>
        <div class="summary-item"><div class="summary-label">TỔNG CHI PHÍ:</div><div>${formatCurrency(totalExpenses)}</div></div>
        <div class="summary-item"><div class="summary-label">LỢI NHUẬN RÒNG:</div><div>${formatCurrency(netProfit)}</div></div>
      </div>
      <div class="section-title">CHI TIẾT DOANH THU, CHI PHÍ, LỢI NHUẬN THEO NGÀY</div>
      <table><thead><tr><th>STT</th><th>Ngày</th><th>Doanh thu</th><th>Chi phí</th><th>Lợi nhuận</th></tr></thead><tbody>
        ${dailyFinancials.map((d, i) => `<tr><td>${i+1}</td><td>${d.date}</td><td>${formatCurrency(d.revenue)}</td><td>${formatCurrency(d.expenses)}</td><td>${formatCurrency(d.profit)}</td></tr>`).join('')}
      </tbody></table>
      <div class="section-title">DOANH THU THEO DANH MỤC</div>
      <table><thead><tr><th>STT</th><th>Danh mục</th><th>Doanh thu</th><th>Tỷ lệ (%)</th></tr></thead><tbody>
        ${revenueByCategory.map((c, i) => `<tr><td>${i+1}</td><td>${c.category}</td><td>${formatCurrency(c.amount)}</td><td>${c.percentage}</td></tr>`).join('')}
      </tbody></table>
      <div class="section-title">CHI PHÍ THEO DANH MỤC</div>
      <table><thead><tr><th>STT</th><th>Danh mục</th><th>Chi phí</th><th>Tỷ lệ (%)</th></tr></thead><tbody>
        ${expensesByCategory.map((c, i) => `<tr><td>${i+1}</td><td>${c.category}</td><td>${formatCurrency(c.amount)}</td><td>${c.percentage}</td></tr>`).join('')}
      </tbody></table>
      <div class="footer">© ${new Date().getFullYear()} W_LAVIE. Báo cáo được tạo tự động từ hệ thống.</div>
      <div class="page-number">Trang {#pageNum}</div>
    </body></html>
    `;
    const result = await reporter.render({
      template: {
        content: html,
        engine: 'handlebars',
        recipe: 'chrome-pdf',
        chrome: {
          displayHeaderFooter: true,
          marginTop: '1cm',
          marginBottom: '1cm'
        }
      }
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="financial-report.pdf"`,
      'Content-Length': result.content.length
    });
    res.send(result.content);
  } catch (error) {
    console.error('Error generating financial report PDF:', error);
    res.status(500).json({ message: 'Error generating financial report PDF', error: error.message });
  }
};
