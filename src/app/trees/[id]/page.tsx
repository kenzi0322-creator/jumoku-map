'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { use } from 'react';
import type { Tree, Post, Evaluation } from '@/types';
import PostForm from '@/components/PostForm';
import EvaluationForm from '@/components/EvaluationForm';

const scoreColors: Record<number, string> = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#84cc16', 5: '#4ade80' };
const scoreLabels: Record<number, string> = { 1: '深刻', 2: '不良', 3: '普通', 4: '良好', 5: '非常に良好' };

function HealthScore({ score }: { score: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div className="health-score">
        {[1,2,3,4,5].map(n => (
          <div key={n} className={`health-dot ${n <= score ? `score-${score}` : ''} ${n <= score ? 'filled' : ''}`} />
        ))}
      </div>
      <span style={{ fontSize: '0.8rem', color: scoreColors[score], fontWeight: 600 }}>
        {scoreLabels[score]}
      </span>
    </div>
  );
}

function DesignationBadge({ designation }: { designation: string }) {
  const cls =
    designation === '国指定' ? 'designation-national' :
    designation === '都道府県指定' ? 'designation-pref' :
    designation === '市区町村指定' ? 'designation-city' :
    'designation-none';
  return <span className={`designation-badge ${cls}`}>{designation}</span>;
}

export default function TreeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tree, setTree] = useState<(Tree & { posts: Post[]; evaluations: Evaluation[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'evaluations'>('posts');
  const [showPostForm, setShowPostForm] = useState(false);
  const [showEvalForm, setShowEvalForm] = useState(false);

  const fetchTree = useCallback(async () => {
    const res = await fetch(`/api/trees/${id}`);
    if (res.ok) setTree(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  if (loading) {
    return (
      <main style={{ paddingTop: 60, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🌳</div>
          <div>読み込み中...</div>
        </div>
      </main>
    );
  }

  if (!tree) {
    return (
      <main style={{ paddingTop: 60, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🍂</div>
          <div>樹木が見つかりません</div>
          <Link href="/" className="btn-primary" style={{ display: 'inline-block', marginTop: 16 }}>← 地図に戻る</Link>
        </div>
      </main>
    );
  }

  const latestEval = tree.evaluations?.sort((a, b) => b.evaluated_at.localeCompare(a.evaluated_at))[0];

  return (
    <main style={{ paddingTop: 60, minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(180deg, #0a1f0a 0%, var(--bg-primary) 100%)',
        padding: '40px 24px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* BG pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'radial-gradient(circle, #4ade80 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }} />
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
          <Link href="/" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-block', marginBottom: 16 }}>
            ← 地図に戻る
          </Link>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 }}>
            <div>
              <DesignationBadge designation={tree.designation} />
              <h1 style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '8px 0 4px',
                lineHeight: 1.2,
              }}>
                🌳 {tree.name}
              </h1>
              <p style={{ fontSize: '1rem', color: 'var(--green-light)', marginBottom: 6 }}>{tree.species}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>📍 {tree.address}</p>
            </div>
            {latestEval && (
              <div className="glass-card" style={{ padding: '12px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>最新健康評価</div>
                <HealthScore score={latestEval.health_score} />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>by {latestEval.evaluator_name}</div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' as const }}>
            {tree.age_years && (
              <div className="stat-chip">
                <span className="stat-chip-value">{tree.age_years.toLocaleString()}</span>
                <span className="stat-chip-label">推定樹齢(年)</span>
              </div>
            )}
            {tree.height_m && (
              <div className="stat-chip">
                <span className="stat-chip-value">{tree.height_m}</span>
                <span className="stat-chip-label">樹高(m)</span>
              </div>
            )}
            {tree.trunk_circumference_cm && (
              <div className="stat-chip">
                <span className="stat-chip-value">{tree.trunk_circumference_cm}</span>
                <span className="stat-chip-label">幹回り(cm)</span>
              </div>
            )}
            <div className="stat-chip">
              <span className="stat-chip-value">{tree.posts?.length ?? 0}</span>
              <span className="stat-chip-label">訪問記録</span>
            </div>
            <div className="stat-chip">
              <span className="stat-chip-value">{tree.evaluations?.length ?? 0}</span>
              <span className="stat-chip-label">医師評価</span>
            </div>
          </div>

          {tree.description && (
            <p style={{ marginTop: 20, color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.9rem' }}>
              {tree.description}
            </p>
          )}
        </div>
      </div>

      {/* Map mini */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${tree.latitude},${tree.longitude}`}
          target="_blank" rel="noopener noreferrer"
          className="glass-card"
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', marginBottom: 24, transition: 'all 0.25s' }}
        >
          <span style={{ fontSize: '1.5rem' }}>🗺️</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Google マップで確認</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {tree.latitude.toFixed(5)}, {tree.longitude.toFixed(5)}
            </div>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>→</span>
        </a>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['posts', 'evaluations'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px',
                borderRadius: 999,
                border: '1px solid',
                borderColor: activeTab === tab ? 'var(--green-primary)' : 'var(--border-glass)',
                background: activeTab === tab ? 'rgba(74,222,128,0.1)' : 'transparent',
                color: activeTab === tab ? 'var(--green-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab ? 700 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.85rem',
              }}
            >
              {tab === 'posts' ? `📝 訪問記録 (${tree.posts?.length ?? 0})` : `🌿 樹木医評価 (${tree.evaluations?.length ?? 0})`}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'posts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {/* Add post */}
            {!showPostForm ? (
              <button className="btn-secondary" onClick={() => setShowPostForm(true)} style={{ alignSelf: 'flex-start' }}>
                ＋ 訪問記録を投稿する
              </button>
            ) : (
              <div className="glass-card" style={{ padding: 20 }}>
                <h3 className="section-heading">📝 訪問記録を投稿</h3>
                <PostForm treeId={id} onSuccess={() => { setShowPostForm(false); fetchTree(); }} />
                <button onClick={() => setShowPostForm(false)} style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer' }}>キャンセル</button>
              </div>
            )}
            {(tree.posts ?? []).length === 0 ? (
              <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📝</div>
                まだ訪問記録がありません
              </div>
            ) : (
              [...(tree.posts ?? [])].sort((a,b) => b.created_at.localeCompare(a.created_at)).map(post => (
                <div key={post.id} className="glass-card animate-fade-in" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap' as const, gap: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>👤 {post.author_name}</span>
                    <div style={{ display: 'flex', gap: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {post.visited_at && <span>訪問: {post.visited_at}</span>}
                      <span>{new Date(post.created_at).toLocaleDateString('ja-JP')}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{post.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'evaluations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {!showEvalForm ? (
              <button className="btn-secondary" onClick={() => setShowEvalForm(true)} style={{ alignSelf: 'flex-start' }}>
                ＋ 樹木医評価を登録する
              </button>
            ) : (
              <div className="glass-card" style={{ padding: 20 }}>
                <h3 className="section-heading">🌿 樹木医評価を登録</h3>
                <EvaluationForm treeId={id} onSuccess={() => { setShowEvalForm(false); fetchTree(); }} />
                <button onClick={() => setShowEvalForm(false)} style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer' }}>キャンセル</button>
              </div>
            )}
            {(tree.evaluations ?? []).length === 0 ? (
              <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🌿</div>
                まだ樹木医による評価がありません
              </div>
            ) : (
              [...(tree.evaluations ?? [])].sort((a,b) => b.evaluated_at.localeCompare(a.evaluated_at)).map(ev => (
                <div key={ev.id} className="glass-card animate-fade-in" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 8, marginBottom: 10 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>🌿 {ev.evaluator_name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 8 }}>評価日: {ev.evaluated_at}</span>
                    </div>
                    <HealthScore score={ev.health_score} />
                  </div>
                  {ev.vitality && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-muted)' }}>活力度: </span>{ev.vitality}
                    </div>
                  )}
                  {ev.disease_notes && (
                    <div style={{ fontSize: '0.82rem', color: '#f97316', padding: '6px 10px', background: 'rgba(249,115,22,0.08)', borderRadius: 6, margin: '6px 0' }}>
                      ⚠️ {ev.disease_notes}
                    </div>
                  )}
                  {ev.recommendation && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '6px 10px', background: 'rgba(74,222,128,0.06)', borderRadius: 6 }}>
                      💡 {ev.recommendation}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
