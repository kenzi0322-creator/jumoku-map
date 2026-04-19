'use client';

import Link from 'next/link';
import type { Tree } from '@/types';

interface TreeCardProps {
  tree: Tree;
  isSelected?: boolean;
  onClick?: () => void;
}

function DesignationBadge({ designation }: { designation: string }) {
  const cls =
    designation === '国指定' ? 'designation-national' :
    designation === '都道府県指定' ? 'designation-pref' :
    designation === '市区町村指定' ? 'designation-city' :
    'designation-none';
  return (
    <span className={`designation-badge ${cls}`}>
      {designation === '国指定' && '🏛️ '}
      {designation === '都道府県指定' && '🏢 '}
      {designation === '市区町村指定' && '🏛 '}
      {designation}
    </span>
  );
}

export default function TreeCard({ tree, isSelected, onClick }: TreeCardProps) {
  return (
    <div
      className="glass-card"
      onClick={onClick}
      style={{
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.25s',
        borderColor: isSelected ? 'var(--green-primary)' : undefined,
        background: isSelected ? 'rgba(74,222,128,0.07)' : undefined,
        animation: 'fadeSlideIn 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 2 }}>{tree.name}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--green-light)' }}>{tree.species}</div>
        </div>
        <DesignationBadge designation={tree.designation} />
      </div>

      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
        📍 {tree.address}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        {tree.age_years && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-glass)', padding: '2px 8px', borderRadius: 4 }}>
            🕐 推定 {tree.age_years.toLocaleString()}年
          </span>
        )}
        {tree.height_m && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-glass)', padding: '2px 8px', borderRadius: 4 }}>
            📏 樹高 {tree.height_m}m
          </span>
        )}
        {tree.trunk_circumference_cm && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-glass)', padding: '2px 8px', borderRadius: 4 }}>
            🌿 幹回 {tree.trunk_circumference_cm}cm
          </span>
        )}
      </div>

      {tree.source_name && (
        <div style={{ marginTop: 6 }}>
          <span style={{
            fontSize: '0.65rem', padding: '2px 8px', borderRadius: 999,
            background: tree.source_name === '新日本名木100選' ? 'rgba(251,191,36,0.12)'
              : tree.source_name === '森の巨人たち100選' ? 'rgba(52,211,153,0.12)'
              : tree.source_name === 'HARDWOOD投稿' ? 'rgba(139,92,246,0.12)'
              : 'rgba(107,114,128,0.12)',
            color: tree.source_name === '新日本名木100選' ? '#fbbf24'
              : tree.source_name === '森の巨人たち100選' ? '#34d399'
              : tree.source_name === 'HARDWOOD投稿' ? '#a78bfa'
              : 'var(--text-muted)',
            border: '1px solid',
            borderColor: tree.source_name === '新日本名木100選' ? 'rgba(251,191,36,0.3)'
              : tree.source_name === '森の巨人たち100選' ? 'rgba(52,211,153,0.3)'
              : tree.source_name === 'HARDWOOD投稿' ? 'rgba(139,92,246,0.3)'
              : 'var(--border-glass)',
          }}>
            {tree.source_name}
          </span>
        </div>
      )}

      <Link
        href={`/trees/${tree.id}`}
        style={{
          display: 'block',
          marginTop: 10,
          textAlign: 'center' as const,
          background: 'linear-gradient(135deg, var(--green-primary), #22c55e)',
          color: '#000',
          fontWeight: 700,
          fontSize: '0.78rem',
          padding: '6px',
          borderRadius: 999,
        }}
        onClick={e => e.stopPropagation()}
      >
        詳細を見る →
      </Link>
    </div>
  );
}
