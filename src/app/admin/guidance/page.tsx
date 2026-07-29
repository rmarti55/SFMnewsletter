'use client';

import { useEffect, useState } from 'react';

export default function GuidancePage() {
  const [markdown, setMarkdown] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/guidance')
      .then((r) => r.json())
      .then((d) => setMarkdown(d.guidance ?? ''));
  }, []);

  async function save() {
    const res = await fetch('/api/guidance', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guidance: markdown }),
    });
    setMsg(res.ok ? 'Saved (prior version archived).' : 'Save failed.');
  }

  return (
    <div>
      <h1>Editorial guidance</h1>
      <p style={{ color: '#555' }}>Injected into extract + synthesize prompts every generate.</p>
      <textarea
        style={{ width: '100%', minHeight: 500, fontFamily: 'monospace', fontSize: 13 }}
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
      />
      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={save}>Save</button>
      </div>
      {msg && <p>{msg}</p>}
    </div>
  );
}
