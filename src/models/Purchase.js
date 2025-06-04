import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema({
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  },
  supplierName: {
    type: String,
    required: true,
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'canceled'],
    default: 'pending',
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  debtRemaining: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
}, {
  timestamps: true,
});

// Calculate debtRemaining before saving
purchaseSchema.pre('save', function(next) {
  this.debtRemaining = this.totalAmount - this.paidAmount;
  next();
});

const Purchase = mongoose.model('Purchase', purchaseSchema);

export default Purchase;
