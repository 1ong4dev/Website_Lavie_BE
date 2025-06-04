import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema({
  purchaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
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
purchaseItemSchema.pre('save', function(next) {
  this.total = this.quantity * this.unitPrice;
  next();
});

const PurchaseItem = mongoose.model('PurchaseItem', purchaseItemSchema);

export default PurchaseItem; 