import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import initialMessagesData from '@/data/messages.json';

const dataFilePath = path.join(process.cwd(), 'data', 'messages.json');

export async function GET() {
  try {
    if (process.env.MONGODB_URI) {
      await dbConnect();
      let messages = await Message.find({}).sort({ createdAt: 1 }).lean();
      
      // Auto-seed initial 50 Shopify templates if MongoDB collection is empty
      if (!messages || messages.length === 0) {
        await Message.insertMany(initialMessagesData);
        messages = await Message.find({}).sort({ createdAt: 1 }).lean();
      }

      const formatted = messages.map(m => ({
        id: m._id.toString(),
        category: m.category,
        title: m.title,
        content: m.content
      }));

      return NextResponse.json({ messages: formatted, source: 'mongodb' });
    }
  } catch (error) {
    console.warn('MongoDB connection failed, falling back to JSON file:', error.message);
  }

  // Fallback to JSON file
  try {
    if (fs.existsSync(dataFilePath)) {
      const fileData = fs.readFileSync(dataFilePath, 'utf8');
      return NextResponse.json({ messages: JSON.parse(fileData), source: 'json' });
    }
  } catch (e) {}

  return NextResponse.json({ messages: initialMessagesData, source: 'default' });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, id, category, title, content, messages } = body;

    // MongoDB Mode
    if (process.env.MONGODB_URI) {
      await dbConnect();

      if (action === 'delete' && id) {
        await Message.findByIdAndDelete(id);
        const updated = await Message.find({}).sort({ createdAt: 1 }).lean();
        return NextResponse.json({ success: true, messages: formatMessages(updated) });
      }

      if (action === 'reset') {
        await Message.deleteMany({});
        await Message.insertMany(initialMessagesData);
        const reseted = await Message.find({}).sort({ createdAt: 1 }).lean();
        return NextResponse.json({ success: true, messages: formatMessages(reseted) });
      }

      if (id) {
        // Edit existing message
        await Message.findByIdAndUpdate(id, { category, title, content });
      } else if (category && title && content) {
        // Add new message
        await Message.create({ category, title, content });
      } else if (Array.isArray(messages)) {
        // Sync whole list
        await Message.deleteMany({});
        await Message.insertMany(messages);
      }

      const updated = await Message.find({}).sort({ createdAt: 1 }).lean();
      return NextResponse.json({ success: true, messages: formatMessages(updated) });
    }
  } catch (error) {
    console.warn('MongoDB mutation warning:', error.message);
  }

  // Fallback JSON file update
  try {
    const body = await request.json();
    if (Array.isArray(body.messages)) {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(dataFilePath, JSON.stringify(body.messages, null, 2), 'utf8');
    }
    return NextResponse.json({ success: true, message: 'Saved locally' });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

function formatMessages(messages) {
  return messages.map(m => ({
    id: m._id ? m._id.toString() : m.id,
    category: m.category,
    title: m.title,
    content: m.content
  }));
}
