import express from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplierController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, admin, createSupplier);

router.route('/:id')
  .get(protect, getSupplierById)
  .put(protect, admin, updateSupplier)
  .delete(protect, admin, deleteSupplier);

export default router; 