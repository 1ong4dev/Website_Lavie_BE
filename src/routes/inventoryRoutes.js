import express from 'express';
import {
  getInventoryLogs,
  getInventoryLogsByProduct,
  createInventoryLog,
  getInventoryReport,
  getInventoryReportByDate,
  exportInventoryReportByDate
} from '../controllers/inventoryController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, admin, getInventoryLogs)
  .post(protect, admin, createInventoryLog);

router.route('/report')
  .get(protect, admin, getInventoryReport);

router.route('/report/date')
  .get(protect, admin, getInventoryReportByDate);

router.route('/report/date/export')
  .get(protect, admin, exportInventoryReportByDate);

router.route('/product/:id')
  .get(protect, admin, getInventoryLogsByProduct);

export default router;