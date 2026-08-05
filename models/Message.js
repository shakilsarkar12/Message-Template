import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Please provide a category.'],
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a title.'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Please provide content.'],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
