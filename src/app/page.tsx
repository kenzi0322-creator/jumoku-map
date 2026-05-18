'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { Tree } from '@/types';
import { SOURCE_NAMES } from '@/types';
import TreeCard from '@/components/TreeCard';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

const DESIGNATIONS = ['すべて', '国指定', '都道府県指定', '市区町村指定', '無指定'];
const SOURCES = ['すべて', ...SOURCE_NAMES];

// 住所から「市区町村」を抽出する関数（フィルタ用）
function extractMunicipality(address: string): string | null {
  const prefRegex = /^(?:北海道|東京都|京都府|大阪府|.{2,3}県)/;
  const prefMatch = address.match(prefRegex);
  if (!prefMatch) return null;
  const pref = prefMatch[0];
  const rest = address.substring(pref.length);

  // 郡＋町/村（例：山辺郡山添村）
  const gunMatch = rest.match(/^(.+?郡.+?[町村])/);
  if (gunMatch) return gunMatch[1];

  // 市（例：伊賀市）
  const shiMatch = rest.match(/^(.+?市)/);
  if (shiMatch) return shiMatch[1];

  // 特別区/区（例：新宿区）
  const kuMatch = rest.match(/^(.+?区)/);
  if (kuMatch) return kuMatch[1];

  return rest.substring(0, 5);
}

// おもしろタグの合致判定ヘルパー
function matchFunTag(tree: Tree, tag: string): boolean {
  if (tag === 'monster') {
    return !!(tree.trunk_circumference_cm && tree.trunk_circumference_cm >= 1000);
  }
  if (tag === 'flower') {
    return !!(tree.species && (
      tree.species.includes('サクラ') || tree.species.includes('桜') ||
      tree.species.includes('イチョウ') || tree.species.includes('銀杏') ||
      tree.species.includes('モミジ') || tree.species.includes('カエデ') || tree.species.includes('紅葉')
    ));
  }
  if (tag === 'history') {
    return !!(tree.age_years && tree.age_years >= 300);
  }
  return true;
}

export default function HomePage() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [filtered, setFiltered] = useState<Tree[]>([]);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [search, setSearch] = useState('');
  const [designation, setDesignation] = useState('すべて');
  const [sourceFilter, setSourceFilter] = useState('すべて');
  const [selectedMuni, setSelectedMuni] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // おもしろタグ複数選択用
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

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  // サイドバーのデータ絞り込み
  useEffect(() => {
    let result = trees;
    
    // 市区町村フィルター
    if (selectedMuni) {
      result = result.filter(t => extractMunicipality(t.address) === selectedMuni);
    }

    // おもしろタグフィルター（複数選択対応：いずれか一つ以上に合致するOR条件）
    if (selectedTags.length > 0) {
      result = result.filter(t => selectedTags.some(tag => matchFunTag(t, tag)));
    }

    if (designation !== 'すべて') result = result.filter(t => t.designation === designation);
    if (sourceFilter !== 'すべて') result = result.filter(t => t.source_name === sourceFilter);
    if (search) result = result.filter(t =>
      t.name.includes(search) || t.species.includes(search) || t.address.includes(search)
    );
    setFiltered(result);
  }, [trees, search, designation, sourceFilter, selectedMuni, selectedTags]);

  // 地図上に表示する集計用データ（市区町村以外の全フィルターを連動）
  const mapData = useMemo(() => {
    let result = trees;
    
    // おもしろタグフィルターを地図側にも連動させて、バブルを動的に絞る（複数選択対応）
    if (selectedTags.length > 0) {
      result = result.filter(t => selectedTags.some(tag => matchFunTag(t, tag)));
    }

    if (designation !== 'すべて') result = result.filter(t => t.designation === designation);
    if (sourceFilter !== 'すべて') result = result.filter(t => t.source_name === sourceFilter);
    if (search) result = result.filter(t =>
      t.name.includes(search) || t.species.includes(search) || t.address.includes(search)
    );
    return result;
  }, [trees, search, designation, sourceFilter, selectedTags]);

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
          {/* Municipality filter chip */}
          {selectedMuni && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(34,197,94,0.12)',
              color: '#16a34a',
              border: '1.5px solid #22c55e',
              padding: '8px 12px',
              borderRadius: '10px',
              marginBottom: '12px',
              fontSize: '0.85rem',
              fontWeight: 'bold'
            }}>
              <span>📍 {selectedMuni} を表示中</span>
              <button 
                onClick={() => setSelectedMuni(null)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#16a34a', 
                  cursor: 'pointer', 
                  fontSize: '1.2rem', 
                  lineHeight: 1,
                  padding: '0 4px',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Search */}
          <input
            className="form-input"
            placeholder="🔍  樹木名・樹種・所在地で検索"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          {/* 一般の人が探しやすい「おもしろタグ・フィルター」 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
            <button
              onClick={() => handleTagToggle('monster')}
              style={{
                fontSize: '0.72rem',
                fontWeight: 'bold',
                padding: '6px 12px',
                borderRadius: 999,
                border: '1.5px solid',
                borderColor: selectedTags.includes('monster') ? '#f59e0b' : 'var(--border-glass)',
                background: selectedTags.includes('monster') ? 'rgba(251,191,36,0.12)' : 'var(--bg-glass)',
                color: selectedTags.includes('monster') ? '#f59e0b' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap'
              }}
            >
              👑 超巨木
            </button>
            <button
              onClick={() => handleTagToggle('flower')}
              style={{
                fontSize: '0.72rem',
                fontWeight: 'bold',
                padding: '6px 12px',
                borderRadius: 999,
                border: '1.5px solid',
                borderColor: selectedTags.includes('flower') ? '#f43f5e' : 'var(--border-glass)',
                background: selectedTags.includes('flower') ? 'rgba(244,63,94,0.12)' : 'var(--bg-glass)',
                color: selectedTags.includes('flower') ? '#f43f5e' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap'
              }}
            >
              🌸 お花見・紅葉
            </button>
            <button
              onClick={() => handleTagToggle('history')}
              style={{
                fontSize: '0.72rem',
                fontWeight: 'bold',
                padding: '6px 12px',
                borderRadius: 999,
                border: '1.5px solid',
                borderColor: selectedTags.includes('history') ? '#8b5cf6' : 'var(--border-glass)',
                background: selectedTags.includes('history') ? 'rgba(139,92,246,0.12)' : 'var(--bg-glass)',
                color: selectedTags.includes('history') ? '#8b5cf6' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap'
              }}
            >
              ⏳ 歴史の証人
            </button>
          </div>

          {/* Designation filter */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
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
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
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
          trees={mapData}
          onMarkerClick={setSelectedTree}
          selectedTreeId={selectedTree?.id}
          selectedMuni={selectedMuni}
          onMuniClick={setSelectedMuni}
        />
        {/* Stats overlay */}
        <div style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 500,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
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
        </div>
      </div>
    </main>
  );
}
