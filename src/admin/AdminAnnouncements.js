// frontend/src/admin/AdminAnnouncements.js
import React, { useEffect, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '';

export default function AdminAnnouncements() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [newText, setNewText] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/admin-api/settings/announcements`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (!mounted) return;
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      } catch (err) {
        if (mounted) setError('Unable to load announcements');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  function addMessage() {
    const t = (newText || '').trim();
    if (!t) return;
    setMessages(prev => [...prev, t]);
    setNewText('');
  }

  function removeMessage(idx) {
    setMessages(prev => prev.filter((_, i) => i !== idx));
  }

  function moveUp(idx) {
    if (idx <= 0) return;
    setMessages(prev => {
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(idx - 1, 0, item);
      return copy;
    });
  }
  function moveDown(idx) {
    setMessages(prev => {
      if (idx >= prev.length - 1) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(idx + 1, 0, item);
      return copy;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin-api/settings/announcements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Save failed');
      }
      alert('Announcements saved');
    } catch (err) {
      console.error(err);
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading announcements…</div>;

  return (
    <div style={{ padding: 12 }}>
      <h3>Announcements</h3>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ marginBottom: 8 }}>
        <input value={newText} onChange={e => setNewText(e.target.value)} style={{ width: '70%', padding: 8 }} placeholder="New announcement" />
        <button onClick={addMessage} style={{ marginLeft: 8, padding: '8px 12px' }}>Add</button>
      </div>

      <div>
        {messages.length === 0 && <div>No announcements</div>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {messages.map((m, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>{m}</div>
              <div>
                <button onClick={() => moveUp(i)} disabled={i === 0}>↑</button>
                <button onClick={() => moveDown(i)} disabled={i === messages.length - 1} style={{ marginLeft: 6 }}>↓</button>
                <button onClick={() => removeMessage(i)} style={{ marginLeft: 6 }}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={save} disabled={saving} style={{ padding: '8px 14px' }}>{saving ? 'Saving…' : 'Save announcements'}</button>
      </div>
    </div>
  );
}
