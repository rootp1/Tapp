import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchase extends Document {
  userId: string;
  postId: string;
  transactionId: string;
  purchaseDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    postId: {
      type: String,
      required: true,
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

PurchaseSchema.index({ userId: 1, postId: 1 }, { unique: true });

export default mongoose.model<IPurchase>('Purchase', PurchaseSchema);
