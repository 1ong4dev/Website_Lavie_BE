import express from 'express';
import { generateInvoicePdf } from '../controllers/invoiceController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Generate invoice PDF for an order
router.route('/:orderId')
  .get(protect, generateInvoicePdf);

export default router;
