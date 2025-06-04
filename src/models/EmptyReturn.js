import mongoose from 'mongoose';

const emptyReturnSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  delivered: {
    type: Number,
    default: 0,
  },
  returned: {
    type: Number,
    default: 0,
  },
  note: {
    type: String,
  },
});

const EmptyReturn = mongoose.model('EmptyReturn', emptyReturnSchema);

export default EmptyReturn; 