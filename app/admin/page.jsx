'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import initialMessagesData from '@/data/messages.json';

const ADMIN_PASS = 'devnest@2026';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passError, setPassError] = useState('');
  
  const [messages, setMessages] = useState(initialMessagesData || []);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('');
  
  // Form State
  const [catInput, setCatInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [editIdx, setEditIdx] = useState(-1);
  const [syncStatus, setSyncStatus] = useState('ready'); // ready, syncing, success, error

  useEffect(() => {
    fetch('/api/messages')
      .then(res => res.json())
      .then(data => {
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (messages.length) {
      const cats = [...new Set(messages.map(m => m.category))].sort();
      setCategories(cats);
    }
  }, [messages]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASS) {
      setIsAuthenticated(true);
      setPassError('');
    } else {
      setPassError('✕ Incorrect password. Please try again.');
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  const saveTemplate = async (e) => {
    e.preventDefault();
    if (!catInput.trim() || !titleInput.trim() || !contentInput.trim()) return;

    setSyncStatus('syncing');

    const editingItem = editIdx >= 0 ? messages[editIdx] : null;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem ? editingItem.id : undefined,
          category: catInput.trim(),
          title: titleInput.trim(),
          content: contentInput.trim()
        })
      });

      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      } else {
        let updated = [...messages];
        if (editIdx >= 0) {
          updated[editIdx] = { category: catInput.trim(), title: titleInput.trim(), content: contentInput.trim() };
        } else {
          updated.push({ category: catInput.trim(), title: titleInput.trim(), content: contentInput.trim() });
        }
        setMessages(updated);
      }

      clearForm();
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('ready'), 3500);
    } catch (err) {
      setSyncStatus('error');
    }
  };

  const editTemplate = (idx) => {
    const msg = messages[idx];
    setCatInput(msg.category);
    setTitleInput(msg.title);
    setContentInput(msg.content);
    setEditIdx(idx);
  };

  const deleteTemplate = async (idx) => {
    const item = messages[idx];
    if (!confirm(`Delete "${item.title}"?\nThis cannot be undone.`)) return;

    setSyncStatus('syncing');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: item.id })
      });

      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      } else {
        const updated = messages.filter((_, i) => i !== idx);
        setMessages(updated);
      }

      clearForm();
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('ready'), 3500);
    } catch (err) {
      setSyncStatus('error');
    }
  };

  const clearForm = () => {
    setCatInput('');
    setTitleInput('');
    setContentInput('');
    setEditIdx(-1);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message_templates_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const resetDefaults = async () => {
    if (!confirm('Reset ALL templates to factory defaults in MongoDB?\n\nAll custom changes will be lost!')) return;

    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });

      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      } else {
        setMessages(initialMessagesData);
      }

      clearForm();
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('ready'), 3500);
    } catch (err) {
      setSyncStatus('error');
    }
  };

  const filteredList = messages.reduce((acc, m, i) => {
    const matchesCat = !selectedCatFilter || m.category === selectedCatFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (m.title + ' ' + m.content + ' ' + m.category).toLowerCase().includes(q);
    if (matchesCat && matchesSearch) acc.push({ m, i });
    return acc;
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="adm-overlay">
        <div className="adm-login-box">
          <div className="adm-login-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="#FF6B00">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
          </div>
          <h2>Admin Panel</h2>
          <p>Enter password to manage Shopify message templates</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              className="adm-pass-input"
              placeholder="Enter password..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
            {passError && <span className="adm-error-msg">{passError}</span>}
            <button type="submit" className="adm-login-btn">Login to Admin →</button>
          </form>
          <Link href="/" className="adm-back-link">← Back to Templates Explorer</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-panel">
      {/* Admin Navbar */}
      <nav className="adm-nav">
        <div className="adm-nav-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF6B00">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Message Template Admin
          <span className="adm-nav-badge">VERCEL + MONGODB</span>
        </div>
        <div className="adm-nav-right">
          <span className="adm-nav-stat">
            {messages.length} templates · {categories.length} categories
          </span>

          <span className={`adm-sync-status ${syncStatus}`}>
            {syncStatus === 'syncing' && '⏳ Saving...'}
            {syncStatus === 'success' && '✓ Changes Saved'}
            {syncStatus === 'error' && '⚠️ Save Failed'}
            {syncStatus === 'ready' && '☁ Auto Save'}
          </span>

          <button className="adm-nbtn" onClick={exportJSON}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export JSON
          </button>
          <button className="adm-nbtn orange" onClick={resetDefaults}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-3.41"/>
            </svg>
            Reset Defaults
          </button>
          <button className="adm-nbtn solid" onClick={handleLogout}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </nav>

      {/* Admin Content Shell */}
      <div className="adm-body">
        {/* Sidebar Form */}
        <aside className="adm-sidebar">
          <div className="adm-form-heading">
            {editIdx >= 0 ? '✏ Edit Template' : 'Add New Template'}
          </div>
          <form onSubmit={saveTemplate}>
            <div className="adm-field">
              <label className="adm-label">Category</label>
              <input
                type="text"
                className="adm-input"
                list="admCatList"
                placeholder="e.g. Delivery Message"
                value={catInput}
                onChange={(e) => setCatInput(e.target.value)}
                required
              />
              <datalist id="admCatList">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="adm-field">
              <label className="adm-label">Title</label>
              <input
                type="text"
                className="adm-input"
                placeholder="Message title..."
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                required
              />
            </div>
            <div className="adm-field">
              <label className="adm-label">Content</label>
              <textarea
                className="adm-textarea"
                rows={12}
                placeholder="Type message content here..."
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
                required
              />
            </div>
            <div className="adm-form-btns">
              <button type="button" className="adm-btn" onClick={clearForm}>Clear</button>
              <button type="submit" className="adm-btn primary">
                {editIdx >= 0 ? 'Update Template' : 'Add Template'}
              </button>
            </div>
          </form>
        </aside>

        {/* Main Templates List */}
        <main className="adm-main">
          <div className="adm-list-top">
            <input
              type="text"
              className="adm-search"
              placeholder="🔍  Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="adm-cat-sel"
              value={selectedCatFilter}
              onChange={(e) => setSelectedCatFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>
                  {c} ({messages.filter(m => m.category === c).length})
                </option>
              ))}
            </select>
          </div>

          {filteredList.length > 0 ? (
            <div>
              {filteredList.map(({ m, i }) => {
                const preview = m.content.replace(/\n/g, ' ').substring(0, 130);
                return (
                  <div key={m.id || i} className="adm-msg-card">
                    <div className="adm-msg-head">
                      <div className="adm-msg-info">
                        <div className="adm-msg-title">{m.title}</div>
                        <span className="adm-msg-cat">{m.category}</span>
                      </div>
                      <div className="adm-msg-acts">
                        <button className="adm-act-btn edit" onClick={() => editTemplate(i)}>✏ Edit</button>
                        <button className="adm-act-btn del" onClick={() => deleteTemplate(i)}>✕</button>
                      </div>
                    </div>
                    <div className="adm-msg-preview">
                      {preview}{m.content.length > 130 ? '…' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="adm-empty">No templates found</div>
          )}
        </main>
      </div>
    </div>
  );
}
