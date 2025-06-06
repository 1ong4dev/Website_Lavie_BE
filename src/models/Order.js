import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  orderDate: {
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
  returnableAmount: { // Tổng tiền cọc vỏ
    type: Number,
    default: 0,
  },
  // có thể thêm tiền vỏ đã trả nhưng không cần thiết
  debtRemainingReturnable: { // Số tiền cọc vỏ còn nợ
    type: Number,
    default: 0,
  },
  returnableOut: {
    type: Number,
    default: 0,
  },
  returnableIn: {
    type: Number,
    default: 0,
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
orderSchema.pre('save', function(next) {
  this.debtRemaining = this.totalAmount - this.paidAmount;
  this.debtRemainingReturnable = this.returnableAmount - (this.returnableIn *20000);
  next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order; 