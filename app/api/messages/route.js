import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import initialMessagesData from '@/data/messages.json';

export async function GET() {
  try {
    await dbConnect();
    let messages = await Message.find({}).sort({ createdAt: -1 }).lean();

    // Auto-seed initial 50 Shopify templates if MongoDB collection is empty
    if (!messages || messages.length === 0) {
      await Message.insertMany(initialMessagesData);
      messages = await Message.find({}).sort({ createdAt: -1 }).lean();
    }

    const formatted = messages.map(m => ({
      id: m._id.toString(),
      category: m.category,
      title: m.title,
      content: m.content,
      createdAt: m.createdAt
    }));

    return NextResponse.json({ messages: formatted });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Database connection error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { action, id, category, title, content } = body;

    if (action === 'delete' && id) {
      await Message.findByIdAndDelete(id);
    } else if (id) {
      // Update existing message
      await Message.findByIdAndUpdate(id, { category, title, content });
    } else if (category && title && content) {
      // Add new message (createdAt set automatically by Mongoose timestamp)
      await Message.create({ category, title, content });
    }

    // Always sort latest added/updated messages first (-1)
    const updated = await Message.find({}).sort({ createdAt: -1 }).lean();
    const formatted = updated.map(m => ({
      id: m._id.toString(),
      category: m.category,
      title: m.title,
      content: m.content,
      createdAt: m.createdAt
    }));

    return NextResponse.json({ success: true, messages: formatted });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to update database' }, { status: 500 });
  }
}
