'use client';

import React, { useMemo, useState } from 'react';
import type { Tree } from '@/types';

interface DeformedMapProps {
  trees: Tree[];
  selectedPrefecture: string | null;
  onPrefectureClick: (pref: string) => void;
}

// スーファミ風の2Dグリッド配置データ
const JAPAN_GRID = [
  { pref: '北海道', x: 11, y: 0 }, { pref: '青森', x: 11, y: 2 },
  { pref: '秋田', x: 10, y: 3 }, { pref: '岩手', x: 11, y: 3 },
  { pref: '山形', x: 10, y: 4 }, { pref: '宮城', x: 11, y: 4 },
  { pref: '福島', x: 10, y: 5 }, { pref: '新潟', x: 9, y: 5 },
  { pref: '石川', x: 8, y: 6 }, { pref: '富山', x: 9, y: 6 }, { pref: '長野', x: 10, y: 6 }, { pref: '群馬', x: 11, y: 6 }, { pref: '栃木', x: 12, y: 6 }, { pref: '茨城', x: 13, y: 6 },
  { pref: '福井', x: 8, y: 7 }, { pref: '岐阜', x: 9, y: 7 }, { pref: '山梨', x: 10, y: 7 }, { pref: '埼玉', x: 11, y: 7 }, { pref: '千葉', x: 12, y: 7 },
  { pref: '滋賀', x: 8, y: 8 }, { pref: '愛知', x: 9, y: 8 }, { pref: '静岡', x: 10, y: 8 }, { pref: '神奈川', x: 11, y: 8 }, { pref: '東京', x: 12, y: 8 },
  { pref: '京都', x: 7, y: 8 }, { pref: '大阪', x: 7, y: 9 }, { pref: '奈良', x: 8, y: 9 }, { pref: '三重', x: 9, y: 9 },
  { pref: '兵庫', x: 6, y: 8 }, { pref: '和歌山', x: 7, y: 10 },
  { pref: '鳥取', x: 5, y: 8 }, { pref: '島根', x: 4, y: 8 }, { pref: '岡山', x: 5, y: 9 }, { pref: '広島', x: 4, y: 9 }, { pref: '山口', x: 3, y: 9 },
  { pref: '香川', x: 5, y: 10 }, { pref: '徳島', x: 6, y: 10 }, { pref: '愛媛', x: 4, y: 10 }, { pref: '高知', x: 5, y: 11 },
  { pref: '福岡', x: 2, y: 9 }, { pref: '佐賀', x: 1, y: 9 }, { pref: '長崎', x: 0, y: 9 },
  { pref: '大分', x: 2, y: 10 }, { pref: '熊本', x: 1, y: 10 }, { pref: '宮崎', x: 2, y: 11 }, { pref: '鹿児島', x: 1, y: 11 },
  { pref: '沖縄', x: 0, y: 12 },
];

const TREE_ICONS: Record<string, string> = {
  'スギ': '/icons/trees/cedar.png',
  'サクラ': '/icons/trees/sakura.png',
  'マツ': '/icons/trees/pine.png',
  'イチョウ': '/icons/trees/ginkgo.png',
  'default': '/icons/trees/generic.png'
};

function getIconForSpecies(species: string) {
  if (species.includes('スギ') || species.includes('杉')) return TREE_ICONS['スギ'];
  if (species.includes('サクラ') || species.includes('桜')) return TREE_ICONS['サクラ'];
  if (species.includes('マツ') || species.includes('松')) return TREE_ICONS['マツ'];
  if (species.includes('イチョウ') || species.includes('銀杏')) return TREE_ICONS['イチョウ'];
  return TREE_ICONS['default'];
}

export default function DeformedMap({ trees, selectedPrefecture, onPrefectureClick }: DeformedMapProps) {
  const prefStats = useMemo(() => {
    const stats: Record<string, string> = {};
    trees.forEach(t => {
      const prefRegex = /^(?:北海道|東京(?:都)?|京都(?:府)?|大阪(?:府)?|[一-龠]{2}県)/;
      const match = t.address.match(prefRegex);
      if (match) {
        let p = match[0];
        if (p === '東京') p = '東京都';
        if (p === '京都') p = '京都府';
        if (p === '大阪') p = '大阪府';
        stats[p] = t.species;
      }
    });
    return stats;
  }, [trees]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#3b82f6', // 海の色
      backgroundImage: `
        linear-gradient(45deg, #2563eb 25%, transparent 25%),
        linear-gradient(-45deg, #2563eb 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #2563eb 75%),
        linear-gradient(-45deg, transparent 75%, #2563eb 75%)
      `,
      backgroundSize: '40px 40px',
      backgroundPosition: '0 0, 0 20px, 20px 20px, 20px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'auto',
      padding: '40px'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(15, 60px)',
        gridTemplateRows: 'repeat(14, 60px)',
        gap: '4px',
        padding: '20px',
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: '16px',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.2)'
      }}>
        {JAPAN_GRID.map((cell) => {
          const isSelected = selectedPrefecture === cell.pref;
          const topSpecies = prefStats[cell.pref];
          const treeIcon = getIconForSpecies(topSpecies || 'default');

          return (
            <div
              key={cell.pref}
              onClick={() => onPrefectureClick(cell.pref)}
              style={{
                gridColumn: cell.x + 1,
                gridRow: cell.y + 1,
                backgroundColor: isSelected ? '#facc15' : '#4ade80',
                borderRadius: '8px',
                border: '3px solid #166534',
                boxShadow: isSelected ? '0 0 15px #facc15' : '4px 4px 0 rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.1s',
                position: 'relative',
                transform: isSelected ? 'scale(1.1)' : 'none',
                zIndex: isSelected ? 10 : 1
              }}
            >
              <div style={{
                position: 'absolute',
                top: -15,
                zIndex: 5,
                filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))'
              }}>
                <img src={treeIcon} alt="tree" style={{ width: 32, height: 32 }} />
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#14532d',
                textAlign: 'center',
                lineHeight: 1.1,
                marginTop: '15px'
              }}>
                {cell.pref.replace('県', '').replace('府', '').replace('都', '')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Decorative Cloud */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        opacity: 0.5,
        fontSize: '3rem',
        animation: 'float 20s linear infinite'
      }}>☁️</div>
      <div style={{
        position: 'absolute',
        top: '70%',
        right: '15%',
        opacity: 0.4,
        fontSize: '2.5rem',
        animation: 'float 25s linear infinite reverse'
      }}>☁️</div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0% { transform: translateX(-100px); }
          100% { transform: translateX(100vw); }
        }
        div::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        div::-webkit-scrollbar-thumb {
          background: #2563eb;
          border-radius: 10px;
        }
      `}} />
    </div>
  );
}
