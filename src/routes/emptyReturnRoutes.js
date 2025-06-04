import express from 'express';
import {
  getEmptyReturns,
  getEmptyReturnById,
  createEmptyReturn,
  getEmptyReturnsByCustomer,
} from '../controllers/emptyReturnController.js';
import { protect, sales } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getEmptyReturns)
  .post(protect, sales, createEmptyReturn);

router.route('/:id')
  .get(protect, getEmptyReturnById);

router.route('/customer/:id')
  .get(protect, getEmptyReturnsByCustomer);

export default router; 