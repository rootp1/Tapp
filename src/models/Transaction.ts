import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  transactionId: string;
  postId: string;
  buyerId: string;
  creatorId: string;
  amount: number;
  platformFee: number;
  creatorEarnings: number;
  currency: string;
  tonTransactionHash?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  walletAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    postId: {
      type: String,
      required: true,
      index: true,
    },
    buyerId: {
      type: String,
      required: true,
      index: true,
    },
    creatorId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    platformFee: {
      type: Number,
      required: true,
    },
    creatorEarnings: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'TON',
    },
    tonTransactionHash: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    walletAddress: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
