import mongoose, { Schema, Document } from 'mongoose';

export interface IChannel extends Document {
  channelId: string;
  channelUsername?: string;
  channelTitle: string;
  creatorId: string;
  isActive: boolean;
  totalPosts: number;
  totalEarnings: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelSchema: Schema = new Schema(
  {
    channelId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    channelUsername: String,
    channelTitle: {
      type: String,
      required: true,
    },
    creatorId: {
      type: String,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    totalPosts: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IChannel>('Channel', ChannelSchema);
