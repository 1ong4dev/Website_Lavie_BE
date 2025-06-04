import express from 'express';
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  payPurchase,
  exportPurchaseInvoice,
} from '../controllers/purchaseController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, admin, getPurchases)
  .post(protect, admin, createPurchase);

router.route('/:id')
  .get(protect, admin, getPurchaseById);

router.route('/:id/pay')
  .put(protect, admin, payPurchase);

router.route('/:id/invoice')
  .get(protect, admin, exportPurchaseInvoice);

export default router; 