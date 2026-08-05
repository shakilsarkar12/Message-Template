exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo = process.env.GITHUB_REPO || process.env.GH_REPO;
  const branch = process.env.GITHUB_BRANCH || process.env.GH_BRANCH || "main";
  const path = process.env.GITHUB_FILE_PATH || process.env.GH_FILE_PATH || "index.html";

  if (!token || !repo) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Missing GITHUB_TOKEN/GH_TOKEN or GITHUB_REPO/GH_REPO in Netlify Environment Variables."
      })
    };
  }

  try {
    const { messages } = JSON.parse(event.body || "{}");
    if (!Array.isArray(messages)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid messages array provided." })
      };
    }

    // 1. Fetch current file info from GitHub API
    const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
    const getRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Netlify-Function"
      }
    });

    if (!getRes.ok) {
      const err = await getRes.json().catch(() => ({}));
      return {
        statusCode: getRes.status,
        body: JSON.stringify({ error: err.message || `Could not fetch ${path} from ${repo}. Check repository name & permissions.` })
      };
    }

    const fileData = await getRes.json();
    const currentSha = fileData.sha;
    const remoteContent = Buffer.from(fileData.content, "base64").toString("utf-8");

    // 2. Safely replace messages array without $ regex corruption
    const messagesJson = JSON.stringify(messages, null, 2);
    const updatedContent = remoteContent.replace(
      /(const\s+messages\s*=\s*\[)[\s\S]*?(\];)/,
      () => `const messages = ${messagesJson};`
    );

    const updatedBase64 = Buffer.from(updatedContent, "utf-8").toString("base64");

    // 3. Push update via PUT to GitHub API
    const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Netlify-Function"
      },
      body: JSON.stringify({
        message: `Update message templates via Netlify Admin (${messages.length} items)`,
        content: updatedBase64,
        sha: currentSha,
        branch: branch
      })
    });

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      return {
        statusCode: putRes.status,
        body: JSON.stringify({ error: err.message || "Failed to commit changes to GitHub." })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Successfully synced to GitHub repository!" })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Server error occurred while syncing." })
    };
  }
};
