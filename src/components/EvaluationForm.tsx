'use client';

import { useState } from 'react';
import type { EvaluationInsert } from '@/types';

interface EvaluationFormProps {
  treeId: string;
  onSuccess: () => void;
}

const VITALITY_OPTIONS = ['非常に良好', '良好', '普通', '不良', '瀕死'];

export default function EvaluationForm({ treeId, onSuccess }: EvaluationFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState<Omit<EvaluationInsert, 'tree_id'>>({
    evaluator_name: '',
    health_score: 3,
    vitality: '',
    disease_notes: null,
    recommendation: null,
    evaluated_at: today,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.name === 'health_score' ? Number(e.target.value) : e.target.value || null;
    setForm(f => ({ ...f, [e.target.name]: val }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.evaluator_name) { setError('樹木医名は必須です'); return; }
    setLoading(true);
    setError('');
    const res = await fetch('/api/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tree_id: treeId }),
    });
    setLoading(false);
    if (!res.ok) { setError('登録に失敗しました'); return; }
    onSuccess();
  };

  const scoreLabels: Record<number, string> = { 1: '深刻', 2: '不良', 3: '普通', 4: '良好', 5: '非常に良好' };
  const scoreColors: Record<number, string> = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#84cc16', 5: '#4ade80' };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">樹木医名 *</label>
          <input className="form-input" name="evaluator_name" value={form.evaluator_name} onChange={handle} placeholder="鈴木一郎 樹木医" required />
        </div>
        <div className="form-group">
          <label className="form-label">評価日</label>
          <input className="form-input" type="date" name="evaluated_at" value={form.evaluated_at} onChange={handle} />
        </div>
      </div>

      {/* Health Score */}
      <div className="form-group">
        <label className="form-label">健康スコア</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setForm(f => ({ ...f, health_score: n as EvaluationInsert['health_score'] }))}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                border: `2px solid ${form.health_score === n ? scoreColors[n] : 'var(--border-glass)'}`,
                background: form.health_score === n ? `${scoreColors[n]}22` : 'var(--bg-glass)',
                color: form.health_score === n ? scoreColors[n] : 'var(--text-muted)',
                fontWeight: 700, fontSize: '1rem',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {n}
            </button>
          ))}
          <span style={{ fontSize: '0.85rem', color: scoreColors[form.health_score], fontWeight: 600 }}>
            {scoreLabels[form.health_score]}
          </span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">活力度</label>
        <select className="form-select" name="vitality" value={form.vitality ?? ''} onChange={handle}>
          <option value="">選択してください</option>
          {VITALITY_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">病気・害虫メモ</label>
        <textarea className="form-textarea" name="disease_notes" onChange={handle}
          placeholder="病気や害虫の状況があれば記入" rows={2} />
      </div>

      <div className="form-group">
        <label className="form-label">推奨対応</label>
        <textarea className="form-textarea" name="recommendation" onChange={handle}
          placeholder="必要な処置や管理方法の推奨事項" rows={2} />
      </div>

      {error && <p style={{ color: '#f87171', fontSize: '0.8rem' }}>{error}</p>}
      <button className="btn-primary" type="submit" disabled={loading} style={{ alignSelf: 'flex-end' }}>
        {loading ? '登録中...' : '🌿 評価を登録する'}
      </button>
    </form>
  );
}
