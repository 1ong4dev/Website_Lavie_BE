import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['retail', 'agency'],
    required: true,
  },
  phone: {
    type: String,
  },
  address: {
    type: String,
  },
  debt: {
    type: Number,
    default: 0,
  },
  empty_debt: {
    type: Number,
    default: 0,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
}, {
  timestamps: true,
});

const Customer = mongoose.model('Customer', customerSchema);

export default Customer; 