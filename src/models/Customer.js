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
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  // bỏ
  agency_level: {
    type: Number,
    required: function() {
      return this.type === 'agency';
    },
  },
  debt: {
    type: Number,
    default: 0,
  },
  empty_debt: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

const Customer = mongoose.model('Customer', customerSchema);

export default Customer; 