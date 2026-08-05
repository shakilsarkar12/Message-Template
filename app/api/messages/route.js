import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'messages.json');

function getMessagesFromFile() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const fileData = fs.readFileSync(dataFilePath, 'utf8');
      return JSON.parse(fileData);
    }
  } catch (e) {
    console.error('Error reading messages.json:', e);
  }
  return [];
}

export async function GET() {
  const messages = getMessagesFromFile();
  return NextResponse.json({ messages });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array provided.' }, { status: 400 });
    }

    // Ensure data folder exists & write JSON file
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(dataFilePath, JSON.stringify(messages, null, 2), 'utf8');

    // Trigger GitHub API sync in background if environment variables are set
    triggerGitHubSync(messages).catch(err => console.error('GitHub Sync Warning:', err.message));

    return NextResponse.json({ success: true, message: 'Messages updated successfully.' });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to update messages.' }, { status: 500 });
  }
}

async function triggerGitHubSync(messages) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo = process.env.GITHUB_REPO || process.env.GH_REPO;
  const branch = process.env.GITHUB_BRANCH || process.env.GH_BRANCH || 'main';
  const filePath = process.env.GITHUB_FILE_PATH || process.env.GH_FILE_PATH || 'data/messages.json';

  if (!token || !repo) return;

  const url = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`;
  const getRes = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'NextJS-App'
    }
  });

  if (!getRes.ok) return;

  const fileData = await getRes.json();
  const currentSha = fileData.sha;
  const updatedContent = JSON.stringify(messages, null, 2);
  const updatedBase64 = Buffer.from(updatedContent, 'utf-8').toString('base64');

  await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'NextJS-App'
    },
    body: JSON.stringify({
      message: `Update messages via Next.js Admin (${messages.length} templates)`,
      content: updatedBase64,
      sha: currentSha,
      branch: branch
    })
  });
}
