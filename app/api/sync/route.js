import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo = process.env.GITHUB_REPO || process.env.GH_REPO;
  const branch = process.env.GITHUB_BRANCH || process.env.GH_BRANCH || 'main';
  const filePath = process.env.GITHUB_FILE_PATH || process.env.GH_FILE_PATH || 'data/messages.json';

  if (!token || !repo) {
    return NextResponse.json({ error: 'Missing GITHUB_TOKEN or GITHUB_REPO in server environment variables.' }, { status: 500 });
  }

  try {
    const dataFilePath = path.join(process.cwd(), 'data', 'messages.json');
    let messages = [];
    if (fs.existsSync(dataFilePath)) {
      messages = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    }

    const url = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`;
    const getRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'NextJS-App'
      }
    });

    if (!getRes.ok) {
      const err = await getRes.json().catch(() => ({}));
      return NextResponse.json({ error: err.message || 'Could not fetch file from GitHub.' }, { status: getRes.status });
    }

    const fileData = await getRes.json();
    const currentSha = fileData.sha;
    const updatedContent = JSON.stringify(messages, null, 2);
    const updatedBase64 = Buffer.from(updatedContent, 'utf-8').toString('base64');

    const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'NextJS-App'
      },
      body: JSON.stringify({
        message: `Update message templates via Admin (${messages.length} templates)`,
        content: updatedBase64,
        sha: currentSha,
        branch: branch
      })
    });

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      return NextResponse.json({ error: err.message || 'Failed to commit to GitHub.' }, { status: putRes.status });
    }

    return NextResponse.json({ success: true, message: 'Successfully synced to GitHub!' });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error occurred during sync.' }, { status: 500 });
  }
}
