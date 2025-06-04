import mongoose from 'mongoose';

const importItemSchema = new mongoose.Schema({
  importId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Import',
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
importItemSchema.pre('save', function(next) {
  this.total = this.quantity * this.unitPrice;
  next();
});

const ImportItem = mongoose.model('ImportItem', importItemSchema);

export default ImportItem; 