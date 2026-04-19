'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TreeInsert, Designation, SourceName } from '@/types';
import { SOURCE_NAMES } from '@/types';

const DESIGNATIONS: Designation[] = ['国指定', '都道府県指定', '市区町村指定', '無指定'];

export default function NewTreePage() {
  const router = useRouter();
  const [form, setForm] = useState<Partial<TreeInsert>>({ designation: '無指定', source_name: 'ユーザー投稿' as SourceName });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const v = e.target.value;
    const numFields = ['latitude','longitude','trunk_circumference_cm','height_m','age_years'];
    setForm(f => ({ ...f, [e.target.name]: numFields.includes(e.target.name) ? (v ? Number(v) : null) : v }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.species || !form.latitude || !form.longitude || !form.address) {
      setError('名前・樹種・緯度・経度・所在地は必須です');
      return;
    }
    setLoading(true);
    setError('');
    const res = await fetch('/api/trees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) { setError('登録に失敗しました'); setLoading(false); return; }
    const tree = await res.json();
    router.push(`/trees/${tree.id}`);
  };

  return (
    <main style={{ paddingTop: 60, minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
            <a href="/" style={{ color: 'inherit' }}>← 地図に戻る</a>
          </div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            🌳 新しい樹木を登録
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: '0.9rem' }}>
            名木・巨木の情報を地図に追加しましょう
          </p>
        </div>

        <form onSubmit={submit}>
          {/* Basic Info */}
          <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
            <h2 className="section-heading">基本情報</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">樹木名 *</label>
                  <input className="form-input" name="name" onChange={handle} placeholder="大楠（熱海）" required />
                </div>
                <div className="form-group">
                  <label className="form-label">樹種 *</label>
                  <input className="form-input" name="species" onChange={handle} placeholder="クスノキ" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">所在地 *</label>
                <input className="form-input" name="address" onChange={handle} placeholder="静岡県熱海市" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">指定区分</label>
                  <select className="form-select" name="designation" onChange={handle} defaultValue="無指定">
                    {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">データ区分</label>
                  <select className="form-select" name="source_name" onChange={handle} defaultValue="ユーザー投稿">
                    {SOURCE_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">説明</label>
                <textarea className="form-textarea" name="description" onChange={handle}
                  placeholder="この樹木についての詳細な説明" rows={3} />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
            <h2 className="section-heading">📍 位置情報</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">緯度 *</label>
                <input className="form-input" name="latitude" type="number" step="0.000001" onChange={handle} placeholder="35.0986" required />
              </div>
              <div className="form-group">
                <label className="form-label">経度 *</label>
                <input className="form-input" name="longitude" type="number" step="0.000001" onChange={handle} placeholder="139.0727" required />
              </div>
            </div>
            <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 8 }}>
              💡 Google マップで場所を右クリックすると緯度・経度をコピーできます
            </p>
          </div>

          {/* Physical Info */}
          <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
            <h2 className="section-heading">🌿 樹木データ（任意）</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">推定樹齢(年)</label>
                <input className="form-input" name="age_years" type="number" onChange={handle} placeholder="1000" />
              </div>
              <div className="form-group">
                <label className="form-label">樹高(m)</label>
                <input className="form-input" name="height_m" type="number" step="0.1" onChange={handle} placeholder="25.0" />
              </div>
              <div className="form-group">
                <label className="form-label">幹回り(cm)</label>
                <input className="form-input" name="trunk_circumference_cm" type="number" onChange={handle} placeholder="800" />
              </div>
            </div>
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
              ⚠️ {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <a href="/" className="btn-secondary">キャンセル</a>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? '登録中...' : '🌳 樹木を登録する'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
