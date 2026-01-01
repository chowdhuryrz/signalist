import { Schema, models, model, Document } from "mongoose";

export interface AlertItem extends Document {
  userId: string;
  symbol: string;
  company: string;
  alertName: string;
  alertType: 'upper' | 'lower';
  threshold: number;
  cadence: 'once' | 'daily' | 'weekly';
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

const AlertSchema = new Schema<AlertItem>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  company: {
    type: String,
    required: true,
    trim: true,
  },
  alertName: {
    type: String,
    required: true,
    trim: true,
  },
  alertType: {
    type: String,
    required: true,
    enum: ['upper', 'lower'],
  },
  threshold: {
    type: Number,
    required: true,
  },
  cadence: {
    type: String,
    required: true,
    enum: ['once', 'daily', 'weekly'],
    default: 'once',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastTriggered: {
    type: Date,
    required: false,
  },
});

// Compound index for querying user alerts
AlertSchema.index({ userId: 1, symbol: 1 });
AlertSchema.index({ userId: 1, isActive: 1 });

const Alert = models?.Alert || model<AlertItem>("Alert", AlertSchema);

export default Alert;
