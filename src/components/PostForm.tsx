'use client';

import { useState } from 'react';
import type { PostInsert } from '@/types';

interface PostFormProps {
  treeId: string;
  onSuccess: () => void;
}

export default function PostForm({ treeId, onSuccess }: PostFormProps) {
  const [form, setForm] = useState<Omit<PostInsert, 'tree_id'>>({
    author_name: '',
    content: '',
    image_url: null,
    visited_at: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value || null }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.author_name || !form.content) { setError('名前とコメントは必須です'); return; }
    setLoading(true);
    setError('');
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tree_id: treeId }),
    });
    setLoading(false);
    if (!res.ok) { setError('投稿に失敗しました'); return; }
    setForm({ author_name: '', content: '', image_url: null, visited_at: null });
    onSuccess();
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">お名前 *</label>
          <input className="form-input" name="author_name" value={form.author_name} onChange={handle} placeholder="山田太郎" required />
        </div>
        <div className="form-group">
          <label className="form-label">訪問日</label>
          <input className="form-input" type="date" name="visited_at" onChange={handle} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">コメント *</label>
        <textarea className="form-textarea" name="content" value={form.content} onChange={handle} placeholder="この樹木を訪れた感想・情報を書いてください" rows={3} required />
      </div>
      {error && <p style={{ color: '#f87171', fontSize: '0.8rem' }}>{error}</p>}
      <button className="btn-primary" type="submit" disabled={loading} style={{ alignSelf: 'flex-end' }}>
        {loading ? '投稿中...' : '📝 投稿する'}
      </button>
    </form>
  );
}
