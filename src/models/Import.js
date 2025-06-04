import mongoose from 'mongoose';

const importSchema = new mongoose.Schema({
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  supplierName: {
    type: String,
    required: true,
  },
  importDate: {
    type: Date,
    default: Date.now,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  note: {
    type: String,
  },
}, {
  timestamps: true,
});

const Import = mongoose.model('Import', importSchema);

export default Import; 