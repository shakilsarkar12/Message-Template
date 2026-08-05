'use client';

import { useState, useEffect } from 'react';
import initialMessagesData from '@/data/messages.json';

const CONFIG = {
  copyBtnText: "Copy Text",
  filterBtnText: "Message Checker",
  emptyMsg: "Message Updating Soon...",
  filterUrl: "https://safemessage.shakildev.online"
};

export default function HomePage() {
  const [messages, setMessages] = useState(initialMessagesData || []);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch latest messages from API
    fetch('/api/messages')
      .then(res => res.json())
      .then(data => {
        if (data.messages && Array.isArray(data.messages) && data.messages.length) {
          setMessages(data.messages);
        }
      })
      .catch(() => {})
      .finally(() => {
        setTimeout(() => setLoading(false), 500);
      });
  }, []);

  useEffect(() => {
    if (messages.length) {
      const cats = [...new Set(messages.map(m => m.category))];
      setCategories(cats);
      if (!activeCategory && cats.length) {
        setActiveCategory(cats[0]);
      }
    }
  }, [messages, activeCategory]);

  const handleTabClick = (cat) => {
    setLoading(true);
    setActiveCategory(cat);
    setTimeout(() => setLoading(false), 400);
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(idx);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const redirectToFilter = (text) => {
    window.open(`${CONFIG.filterUrl}?msg=${encodeURIComponent(text)}`, '_blank');
  };

  // Filter messages based on active category and search query
  const filteredMessages = messages.filter(m => {
    const matchesCat = m.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (m.title + ' ' + m.content).toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="mm-wrapper">
      {/* Animated Loader */}
      <div className={`mm-loader-overlay ${!loading ? 'hidden' : ''}`}>
        <div className="mm-spinner-container">
          <div className="mm-spinner-ring"></div>
          <div className="mm-spinner-logo">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
            </svg>
          </div>
        </div>
        <p className="mm-loader-text">Loading Templates...</p>
      </div>

      <div className="mm-container">
        {/* Header */}
        <div className="mm-header">
          <h1 className="mm-title">Message <span>Templates</span></h1>
          <p className="mm-subtitle">Browse, search and copy ready-made templates for any situation.</p>
        </div>

        {/* Category Pill Tabs */}
        <div className="mm-tabs-wrapper">
          <div className="mm-tabs">
            {categories.map(cat => {
              const count = messages.filter(m => m.category === cat).length;
              const isActive = cat === activeCategory;
              return (
                <button
                  key={cat}
                  className={`mm-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => handleTabClick(cat)}
                >
                  {cat} <span className="tab-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="mm-stats">
          Showing <strong>{filteredMessages.length}</strong> template{filteredMessages.length !== 1 ? 's' : ''} in <strong>{activeCategory}</strong>
        </div>

        {/* Search Box */}
        <div className="mm-search-box">
          <span className="mm-search-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="mm-input"
            placeholder="Search templates by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Templates List */}
        {filteredMessages.length > 0 ? (
          <div className="mm-list">
            {filteredMessages.map((msg, idx) => (
              <div key={idx} className="mm-card">
                <div className="mm-card-header">
                  <h3 className="mm-card-title">{msg.title}</h3>
                  <span className="mm-card-badge">{msg.category}</span>
                </div>
                <div className="mm-card-body">{msg.content}</div>
                <div className="mm-actions">
                  <button
                    className="mm-btn mm-btn-filter"
                    onClick={() => redirectToFilter(msg.content)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                    </svg>
                    {CONFIG.filterBtnText}
                  </button>
                  <button
                    className={`mm-btn mm-btn-copy ${copiedId === idx ? 'copied' : ''}`}
                    onClick={() => copyToClipboard(msg.content, idx)}
                  >
                    {copiedId === idx ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        {CONFIG.copyBtnText}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mm-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>{CONFIG.emptyMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}
