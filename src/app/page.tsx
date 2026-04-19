'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { Tree } from '@/types';
import { SOURCE_NAMES } from '@/types';
import TreeCard from '@/components/TreeCard';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

const DESIGNATIONS = ['すべて', '国指定', '都道府県指定', '市区町村指定', '無指定'];
const SOURCES = ['すべて', ...SOURCE_NAMES];

export default function HomePage() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [filtered, setFiltered] = useState<Tree[]>([]);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [search, setSearch] = useState('');
  const [designation, setDesignation] = useState('すべて');
  const [sourceFilter, setSourceFilter] = useState('すべて');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchTrees = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/trees');
    if (res.ok) {
      const data = await res.json();
      setTrees(data);
      setFiltered(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTrees(); }, [fetchTrees]);

  useEffect(() => {
    let result = trees;
    if (designation !== 'すべて') result = result.filter(t => t.designation === designation);
    if (sourceFilter !== 'すべて') result = result.filter(t => t.source_name === sourceFilter);
    if (search) result = result.filter(t =>
      t.name.includes(search) || t.species.includes(search) || t.address.includes(search)
    );
    setFiltered(result);
  }, [trees, search, designation, sourceFilter]);

  return (
    <main style={{
      position: 'fixed',
      top: 60,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      overflow: 'hidden',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 340 : 0,
        minWidth: sidebarOpen ? 340 : 0,
        overflow: 'hidden',
        transition: 'width 0.3s ease, min-width 0.3s ease',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-glass)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 10,
        flexShrink: 0,
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-glass)' }}>
          {/* Search */}
          <input
            className="form-input"
            placeholder="🔍  樹木名・樹種・所在地で検索"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          {/* Designation filter */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, marginBottom: 6 }}>
            {DESIGNATIONS.map(d => (
              <button
                key={d}
                onClick={() => setDesignation(d)}
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 8px',
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: designation === d ? 'var(--green-primary)' : 'var(--border-glass)',
                  background: designation === d ? 'rgba(74,222,128,0.12)' : 'transparent',
                  color: designation === d ? 'var(--green-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {d}
              </button>
            ))}
          </div>
          {/* Source filter */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
            {SOURCES.map(s => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 8px',
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: sourceFilter === s ? '#fbbf24' : 'var(--border-glass)',
                  background: sourceFilter === s ? 'rgba(251,191,36,0.12)' : 'transparent',
                  color: sourceFilter === s ? '#fbbf24' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {s === 'すべて' ? '🏷 ' + s : s}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
            {filtered.length} 件の樹木
          </div>
        </div>

        {/* Tree List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card loading-shimmer" style={{ height: 130, borderRadius: 16 }} />
            ))
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 20px' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🌿</div>
              <div>条件に合う樹木が見つかりません</div>
            </div>
          ) : (
            filtered.map(tree => (
              <TreeCard
                key={tree.id}
                tree={tree}
                isSelected={selectedTree?.id === tree.id}
                onClick={() => setSelectedTree(tree)}
              />
            ))
          )}
        </div>

        {/* Register CTA */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-glass)' }}>
          <Link href="/trees/new" className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>
            ＋ 新しい樹木を登録する
          </Link>
        </div>
      </aside>

      {/* Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(o => !o)}
        style={{
          position: 'absolute',
          left: sidebarOpen ? 340 : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 20,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-glass)',
          color: 'var(--text-secondary)',
          borderRadius: '0 8px 8px 0',
          padding: '12px 6px',
          cursor: 'pointer',
          transition: 'left 0.3s ease',
          backdropFilter: 'blur(12px)',
        }}
        aria-label="サイドバーを切り替え"
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0 }}>
        <Map
          trees={filtered}
          onMarkerClick={setSelectedTree}
          selectedTreeId={selectedTree?.id}
        />
        {/* Stats overlay */}
        <div style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 500,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap' as const,
          justifyContent: 'flex-end',
        }}>
          <div className="stat-chip glass-card" style={{ padding: '8px 16px' }}>
            <span className="stat-chip-value">{trees.length}</span>
            <span className="stat-chip-label">登録樹木</span>
          </div>
          <div className="stat-chip glass-card" style={{ padding: '8px 16px' }}>
            <span className="stat-chip-value">{trees.filter(t => t.designation === '国指定').length}</span>
            <span className="stat-chip-label">国指定</span>
          </div>
          <div className="stat-chip glass-card" style={{ padding: '8px 16px' }}>
            <span className="stat-chip-value" style={{ color: '#fbbf24' }}>
              {trees.filter(t => t.source_name === '新日本名木100選').length}
            </span>
            <span className="stat-chip-label">名木100選</span>
          </div>
          <div className="stat-chip glass-card" style={{ padding: '8px 16px' }}>
            <span className="stat-chip-value" style={{ color: '#34d399' }}>
              {trees.filter(t => t.source_name === '森の巨人たち100選').length}
            </span>
            <span className="stat-chip-label">巨人100選</span>
          </div>
        </div>
      </div>
    </main>
  );
}

