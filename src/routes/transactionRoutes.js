import express from 'express';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  getTransactionsByCustomer,
} from '../controllers/transactionController.js';
import { protect, sales } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getTransactions)
  .post(protect, sales, createTransaction);

router.route('/:id')
  .get(protect, getTransactionById);

router.route('/customer/:id')
  .get(protect, getTransactionsByCustomer);

export default router; 