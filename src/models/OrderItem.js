import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
});

// Calculate total before saving
orderItemSchema.pre('save', function(next) {
  this.total = this.quantity * this.unitPrice;
  next();
});

const OrderItem = mongoose.model('OrderItem', orderItemSchema);

export default OrderItem; 