import express from 'express';
import {
  getSalesReport,
  getInventoryReport,
  getDebtReport,
  getCustomerDebtReport,
  getSupplierDebtReport,
  getDashboardStats,
  getFinancialReport,
} from '../controllers/reportController.js';
import {
  getDailyRevenue,
  getMonthlyRevenue,
  getBestSellingProducts,
} from '../controllers/invoiceController.js';
import {
  generateInvoicePdf,
  exportInventoryReport,
  exportRevenueReport,
  exportCustomerDebtReport,
  exportSupplierDebtReport,
  exportSalesReport,
  exportFinancialReport
} from '../controllers/reportPdfController.js';
import { protect, admin, sales } from '../middleware/auth.js';

const router = express.Router();

router.route('/sales')
  .get(protect, sales, getSalesReport);

router.route('/inventory')
  .get(protect, sales, getInventoryReport);

router.route('/debt')
  .get(protect, sales, getDebtReport);

router.route('/customer-debt')
  .get(protect, sales, getCustomerDebtReport);

router.route('/supplier-debt')
  .get(protect, sales, getSupplierDebtReport);

router.route('/dashboard')
  .get(protect, getDashboardStats);

// New routes for revenue statistics
router.route('/revenue/daily')
  .get(protect, sales, getDailyRevenue);

router.route('/revenue/monthly')
  .get(protect, sales, getMonthlyRevenue);

// Best selling products report
router.route('/products/best-selling')
  .get(protect, sales, getBestSellingProducts);

// PDF generation routes
router.route('/invoice/:orderId')
  .get(protect, sales, generateInvoicePdf);

router.route('/inventory/export')
  .get(protect, sales, exportInventoryReport);

router.route('/revenue/export')
  .get(protect, sales, exportRevenueReport);

router.route('/customer-debt/export')
  .get(protect, sales, exportCustomerDebtReport);

router.route('/supplier-debt/export')
  .get(protect, sales, exportSupplierDebtReport);

// Thêm route báo cáo tài chính
router.route('/financial')
  .get(protect, sales, getFinancialReport);

router.route('/sales/export')
  .get(protect, sales, exportSalesReport);

router.route('/financial/export')
  .get(protect, sales, exportFinancialReport);

export default router;