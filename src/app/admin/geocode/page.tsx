'use client';

import { useState, useCallback } from 'react';
import type { Tree } from '@/types';

interface GeoResult {
  id: string;
  name: string;
  address: string;
  status: 'pending' | 'ok' | 'error' | 'skipped';
  lat?: number;
  lng?: number;
  msg?: string;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function nominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=ja&countrycodes=jp`;
  const res = await fetch(url, { headers: { 'User-Agent': 'jumoku-map/1.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

export default function GeocodePage() {
  const [trees, setTrees] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, ok: 0, error: 0 });

  // 座標なし樹木を取得
  const fetchNullTrees = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/trees');
    if (res.ok) {
      const data: Tree[] = await res.json();
      const nullTrees = data.filter(t => t.latitude == null || t.longitude == null);
      setTrees(nullTrees.map(t => ({
        id: t.id,
        name: t.name,
        address: t.address,
        status: 'pending',
      })));
    }
    setLoading(false);
  }, []);

  // ジオコーディング実行
  const startGeocode = async () => {
    setRunning(true);
    const total = trees.filter(t => t.status === 'pending').length;
    setProgress({ done: 0, total, ok: 0, error: 0 });
    let ok = 0, err = 0;

    for (let i = 0; i < trees.length; i++) {
      const tree = trees[i];
      if (tree.status !== 'pending') continue;

      // Nominatim に問い合わせ（樹木名 + 所在地）
      let geo = await nominatim(`${tree.name} ${tree.address}`);
      if (!geo) {
        // 樹木名なしで再試行
        geo = await nominatim(tree.address);
      }

      if (geo) {
        // Supabase を更新
        const patchRes = await fetch(`/api/trees/${tree.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: geo.lat, longitude: geo.lng }),
        });
        if (patchRes.ok) {
          ok++;
          setTrees(prev => prev.map(t => t.id === tree.id
            ? { ...t, status: 'ok', lat: geo!.lat, lng: geo!.lng }
            : t
          ));
        } else {
          err++;
          setTrees(prev => prev.map(t => t.id === tree.id
            ? { ...t, status: 'error', msg: 'DB更新失敗' }
            : t
          ));
        }
      } else {
        err++;
        setTrees(prev => prev.map(t => t.id === tree.id
          ? { ...t, status: 'error', msg: '座標が見つかりませんでした' }
          : t
        ));
      }

      setProgress(p => ({ ...p, done: p.done + 1, ok, error: err }));
      // Nominatim の利用規約：1秒以上の間隔をあける
      await sleep(1100);
    }
    setRunning(false);
  };

  const pendingCount = trees.filter(t => t.status === 'pending').length;
  const okCount = trees.filter(t => t.status === 'ok').length;
  const errorTrees = trees.filter(t => t.status === 'error');

  return (
    <main style={{ paddingTop: 60, minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
            <a href="/" style={{ color: 'inherit' }}>← 地図に戻る</a>
            {' / '}<a href="/admin/import" style={{ color: 'inherit' }}>CSV取込</a>
          </div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.8rem', fontWeight: 700 }}>
            📍 ジオコーディング
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: '0.9rem' }}>
            住所から緯度・経度を自動取得して地図に反映します（OpenStreetMap Nominatim 使用）
          </p>
        </div>

        {/* Step 1: 取得 */}
        <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
          <h2 className="section-heading">① 座標なし樹木を確認</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            データベースから緯度・経度が未設定の樹木を一覧します。
          </p>
          <button className="btn-primary" onClick={fetchNullTrees} disabled={loading || running}>
            {loading ? '読み込み中...' : '🔍 座標なし樹木を取得'}
          </button>
          {trees.length > 0 && (
            <p style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--green-primary)', fontWeight: 600 }}>
              {trees.length} 件の未設定樹木を検出
            </p>
          )}
        </div>

        {/* Step 2: 実行 */}
        {trees.length > 0 && (
          <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
            <h2 className="section-heading">② ジオコーディング実行</h2>

            <div style={{ padding: '12px 16px', background: 'rgba(251,191,36,0.08)', borderRadius: 8, border: '1px solid rgba(251,191,36,0.2)', marginBottom: 16 }}>
              <p style={{ fontSize: '0.82rem', color: '#fbbf24' }}>
                ⚠️ Nominatim の利用規約により、1件ずつ1.1秒間隔で処理します。<br />
                {trees.length}件の場合、約 <strong>{Math.ceil(trees.length * 1.1 / 60)} 分</strong> かかります。
              </p>
            </div>

            {/* Progress */}
            {running && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                  <span>{progress.done} / {progress.total} 件処理中</span>
                  <span>
                    <span style={{ color: 'var(--green-primary)' }}>✓ {progress.ok}</span>
                    {' '}
                    <span style={{ color: '#f87171' }}>✗ {progress.error}</span>
                  </span>
                </div>
                <div style={{ background: 'var(--bg-glass)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, var(--green-primary), #22c55e)',
                    borderRadius: 999,
                    transition: 'width 0.5s',
                  }} />
                </div>
              </div>
            )}

            {!running && pendingCount > 0 && (
              <button className="btn-primary" onClick={startGeocode}>
                🚀 {pendingCount} 件をジオコーディング開始
              </button>
            )}
            {!running && pendingCount === 0 && okCount > 0 && (
              <div style={{ padding: '12px 16px', background: 'rgba(74,222,128,0.08)', borderRadius: 8, color: 'var(--green-primary)', fontSize: '0.9rem' }}>
                ✅ すべての処理が完了しました（{okCount} 件成功）
              </div>
            )}
          </div>
        )}

        {/* Results list */}
        {trees.length > 0 && (
          <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
            <h2 className="section-heading">処理状況</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 500, overflowY: 'auto' }}>
              {trees.map(t => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  background: t.status === 'ok' ? 'rgba(74,222,128,0.06)'
                    : t.status === 'error' ? 'rgba(239,68,68,0.06)'
                    : 'var(--bg-glass)',
                  fontSize: '0.82rem',
                }}>
                  <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}>
                    {t.status === 'pending' ? '⏳' : t.status === 'ok' ? '✅' : t.status === 'error' ? '❌' : '⏭'}
                  </span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{t.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{t.address}</span>
                  {t.status === 'ok' && (
                    <span style={{ color: 'var(--green-primary)', fontSize: '0.72rem' }}>
                      {t.lat?.toFixed(4)}, {t.lng?.toFixed(4)}
                    </span>
                  )}
                  {t.status === 'error' && (
                    <span style={{ color: '#f87171', fontSize: '0.72rem' }}>{t.msg}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error summary */}
        {errorTrees.length > 0 && !running && (
          <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
            <h2 className="section-heading" style={{ color: '#f87171' }}>❌ 座標取得失敗 ({errorTrees.length}件)</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              以下の樹木は手動で座標を入力するか、住所を修正して再度お試しください。
            </p>
            {errorTrees.map(t => (
              <div key={t.id} style={{ fontSize: '0.8rem', padding: '4px 0', borderBottom: '1px solid var(--border-glass)' }}>
                <strong>{t.name}</strong> — {t.address}
              </div>
            ))}
          </div>
        )}

        {/* Finish */}
        {okCount > 0 && !running && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <a href="/" className="btn-primary">🗺️ 地図で確認する</a>
          </div>
        )}

      </div>
    </main>
  );
}
