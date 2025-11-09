import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  postId: string;
  channelId: string;
  creatorId: string;
  teaserMessageId: number;
  price: number;
  currency: string;
  teaserText: string;
  contentType: 'text' | 'photo' | 'video' | 'document' | 'audio';
  contentData: string;
  fileId?: string;
  fileName?: string;
  views: number;
  purchases: number;
  totalEarnings: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema = new Schema(
  {
    postId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    channelId: {
      type: String,
      required: true,
      index: true,
    },
    creatorId: {
      type: String,
      required: true,
      index: true,
    },
    teaserMessageId: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'TON',
    },
    teaserText: {
      type: String,
      required: true,
    },
    contentType: {
      type: String,
      enum: ['text', 'photo', 'video', 'document', 'audio'],
      required: true,
    },
    contentData: {
      type: String,
      required: false,
      default: '',
    },
    fileId: String,
    fileName: String,
    views: {
      type: Number,
      default: 0,
    },
    purchases: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPost>('Post', PostSchema);
