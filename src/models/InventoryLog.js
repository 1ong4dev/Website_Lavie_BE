import mongoose from 'mongoose';

const inventoryLogSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    enum: ['import', 'export', 'return'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  note: {
    type: String,
  },
});

const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);

export default InventoryLog; 