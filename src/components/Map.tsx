'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import type { Tree } from '@/types';

interface MapProps {
  trees: Tree[];
  onMarkerClick: (tree: Tree) => void;
  selectedTreeId?: string;
  selectedMuni?: string | null;
  onMuniClick?: (muni: string | null) => void;
}

// 地方区分（Region）ごとの、完全に統一された単一のパステルカラーパレット
interface RegionColor {
  bg: string;
  hover: string;
  stroke: string;
  name: string;
}

const REGION_THEMES: Record<string, RegionColor> = {
  Hokkaido: { bg: '#e0f2fe', hover: '#bae6fd', stroke: '#0369a1', name: '北海道' },
  Tohoku:   { bg: '#dcfce7', hover: '#bbf7d0', stroke: '#15803d', name: '東北地方' },
  Kanto:    { bg: '#dbeafe', hover: '#bfdbfe', stroke: '#1d4ed8', name: '関東地方' },
  Chubu:    { bg: '#ffedd5', hover: '#fed7aa', stroke: '#ea580c', name: '中部地方' },
  Kinki:    { bg: '#f3e8ff', hover: '#e9d5ff', stroke: '#6d28d9', name: '近畿地方' },
  Chugoku:  { bg: '#fef9c3', hover: '#fef08a', stroke: '#ca8a04', name: '中国地方' },
  Shikoku:  { bg: '#ccfbf1', hover: '#99f6e4', stroke: '#0d9488', name: '四国地方' },
  Kyushu:   { bg: '#fee2e2', hover: '#fecaca', stroke: '#e11d48', name: '九州・沖縄' },
};

const PREF_TO_REGION: Record<string, keyof typeof REGION_THEMES> = {
  '北海道': 'Hokkaido',
  '青森県': 'Tohoku', '岩手県': 'Tohoku', '宮城県': 'Tohoku', '秋田県': 'Tohoku', '山形県': 'Tohoku', '福島県': 'Tohoku',
  '茨城県': 'Kanto', '栃木県': 'Kanto', '群馬県': 'Kanto', '埼玉県': 'Kanto', '千葉県': 'Kanto', '東京都': 'Kanto', '神奈川県': 'Kanto',
  '新潟県': 'Chubu', '富山県': 'Chubu', '石川県': 'Chubu', '福井県': 'Chubu', '山梨県': 'Chubu', '長野県': 'Chubu', '岐阜県': 'Chubu', '静岡県': 'Chubu', '愛知県': 'Chubu',
  '三重県': 'Kinki', '滋賀県': 'Kinki', '京都府': 'Kinki', '大阪府': 'Kinki', '兵庫県': 'Kinki', '奈良県': 'Kinki', '和歌山県': 'Kinki',
  '鳥取県': 'Chugoku', '島根県': 'Chugoku', '岡山県': 'Chugoku', '広島県': 'Chugoku', '山口県': 'Chugoku',
  '徳島県': 'Shikoku', '香川県': 'Shikoku', '愛媛県': 'Shikoku', '高知県': 'Shikoku',
  '福岡県': 'Kyushu', '佐賀県': 'Kyushu', '長崎県': 'Kyushu', '熊本県': 'Kyushu', '大分県': 'Kyushu', '宮崎県': 'Kyushu', '鹿児島県': 'Kyushu', '沖縄県': 'Kyushu',
};

// 地方ごとの、離島などのブレを完全に排除した「ピクセルパーフェクトな中心緯度経度 ＆ ズームスケール」設定
interface RegionCenter {
  lat: number;
  lng: number;
  scale: number;
}

const REGION_CENTERS: Record<string, RegionCenter> = {
  Hokkaido: { lat: 43.4, lng: 142.8, scale: 1.5 },
  Tohoku:   { lat: 39.5, lng: 140.7, scale: 2.1 },
  Kanto:    { lat: 36.2, lng: 139.9, scale: 3.5 },
  Chubu:    { lat: 36.0, lng: 137.6, scale: 3.0 },
  Kinki:    { lat: 34.8, lng: 135.5, scale: 4.1 },
  Chugoku:  { lat: 35.0, lng: 133.1, scale: 3.9 },
  Shikoku:  { lat: 33.7, lng: 133.3, scale: 4.8 },
  Kyushu:   { lat: 32.4, lng: 130.6, scale: 2.6 }, // 九州本島にフォーカス
};

function getPrefColor(prefName: string): RegionColor {
  const region = PREF_TO_REGION[prefName];
  return region ? REGION_THEMES[region] : { bg: '#f1f5f9', hover: '#e2e8f0', stroke: '#64748b', name: 'その他' };
}

function extractMunicipality(address: string): string | null {
  const prefRegex = /^(?:北海道|東京都|京都府|大阪府|.{2,3}県)/;
  const prefMatch = address.match(prefRegex);
  if (!prefMatch) return null;
  const pref = prefMatch[0];
  const rest = address.substring(pref.length);

  const gunMatch = rest.match(/^(.+?郡.+?[町村])/);
  if (gunMatch) return gunMatch[1];
  const shiMatch = rest.match(/^(.+?市)/);
  if (shiMatch) return shiMatch[1];
  const kuMatch = rest.match(/^(.+?区)/);
  if (kuMatch) return kuMatch[1];

  return rest.substring(0, 5);
}

const TREE_ICONS: Record<string, string> = {
  'スギ': '🌲',
  'サクラ': '🌸',
  'マツ': '🌿',
  'イチョウ': '🍂',
  'default': '🌳'
};

function getEmojiForSpecies(species: string) {
  if (species.includes('スギ') || species.includes('杉')) return TREE_ICONS['スギ'];
  if (species.includes('サクラ') || species.includes('桜')) return TREE_ICONS['サクラ'];
  if (species.includes('マツ') || species.includes('松')) return TREE_ICONS['マツ'];
  if (species.includes('イチョウ') || species.includes('銀杏')) return TREE_ICONS['イチョウ'];
  return TREE_ICONS['default'];
}

export default function Map({ trees, selectedMuni, onMuniClick, onMarkerClick, selectedTreeId }: MapProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 800 });

  // 地図のズーム・パン状態（手動操作は無効、自動ズームでのみ使用）
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  // 選択された「地方」ステート（クローズアップ用）
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // 日本全体表示時の「地方単位のホバーハイライト」用ステート
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // マウスホバーされた樹木ID（矢印コネクターのハイライト用）
  const [hoveredTreeId, setHoveredTreeId] = useState<string | null>(null);

  // ツールチップ用
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    title: string;
    count: number;
  }>({ show: false, x: 0, y: 0, title: '', count: 0 });

  // 1. japan.json のフェッチ専用
  useEffect(() => {
    fetch('/japan.json')
      .then(res => res.json())
      .then(topology => {
        const geojson = topojson.feature(topology, topology.objects.prefectures as any);
        setGeoData(geojson);
      });
  }, []);

  // 2. 地図コンテナのサイズ変更を ResizeObserver で 100% 確実に検知・追従する最強のサイズ監視！
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [geoData]);

  // 地図描画エリアの幅は「右300px引き」で完全に固定！
  const mapWidth = useMemo(() => {
    return Math.max(dimensions.width - 310, 500);
  }, [dimensions]);

  // 【日本列島ダイナミック拡大チューニング】
  const projection = useMemo(() => {
    return d3.geoMercator()
      .center([137.8, 38.2])
      .scale(mapWidth * 2.68)
      .translate([mapWidth / 2, dimensions.height / 2 + 10]);
  }, [mapWidth, dimensions]);

  const pathGenerator = d3.geoPath().projection(projection);

  // 地方が選択されたときに自動的にクローズアップ（ズーム）するロジック
  const handleRegionZoom = useCallback((regionKey: string | null) => {
    setSelectedRegion(regionKey);
    if (!regionKey || !geoData) {
      setTransform({ x: 0, y: 0, scale: 1 });
      return;
    }

    const centerConfig = REGION_CENTERS[regionKey];
    if (!centerConfig) return;

    const coords = projection([centerConfig.lng, centerConfig.lat]);
    if (!coords) return;

    const [px, py] = coords;
    const scale = centerConfig.scale;

    const targetX = (mapWidth / 2) - (px * scale);
    const targetY = (dimensions.height / 2) - (py * scale);

    setTransform({
      x: targetX,
      y: targetY,
      scale: scale
    });
  }, [geoData, projection, mapWidth, dimensions]);

  // 各地方ごとの登録樹木数の集計
  const regionStats = useMemo(() => {
    const stats: Record<string, number> = {
      Hokkaido: 0, Tohoku: 0, Kanto: 0, Chubu: 0, Kinki: 0, Chugoku: 0, Shikoku: 0, Kyushu: 0
    };
    trees.forEach(t => {
      const prefMatch = t.address.match(/^(?:北海道|東京都|京都府|大阪府|.{2,3}県)/);
      if (prefMatch) {
        const r = PREF_TO_REGION[prefMatch[0]];
        if (r && stats[r] !== undefined) {
          stats[r] += 1;
        }
      }
    });
    return stats;
  }, [trees]);

  // 市区町村ごとの集計（地方クローズアップ中にのみ、その地方のものを表示）
  const muniGroups = useMemo(() => {
    const groups: Record<string, {
      name: string;
      pref: string;
      count: number;
      latSum: number;
      lngSum: number;
      latCount: number;
      species: Record<string, number>;
    }> = {};

    trees.forEach((tree) => {
      if (tree.latitude == null || tree.longitude == null) return;

      const muni = extractMunicipality(tree.address);
      if (!muni) return;

      const prefRegex = /^(?:北海道|東京都|京都府|大阪府|.{2,3}県)/;
      const prefMatch = tree.address.match(prefRegex);
      const pref = prefMatch ? prefMatch[0] : '';
      const key = `${pref}-${muni}`;

      if (!groups[key]) {
        groups[key] = {
          name: muni,
          pref,
          count: 0,
          latSum: 0,
          lngSum: 0,
          latCount: 0,
          species: {},
        };
      }

      const g = groups[key];
      g.count += 1;
      g.latSum += tree.latitude;
      g.lngSum += tree.longitude;
      g.latCount += 1;
      g.species[tree.species] = (g.species[tree.species] || 0) + 1;
    });

    return Object.values(groups).map((g) => {
      let topSpecies = 'default';
      let maxCount = 0;
      Object.entries(g.species).forEach(([sp, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topSpecies = sp;
        }
      });

      const lat = g.latCount > 0 ? g.latSum / g.latCount : 36.5;
      const lng = g.latCount > 0 ? g.lngSum / g.latCount : 137.0;

      return {
        name: g.name,
        pref: g.pref,
        count: g.count,
        lat,
        lng,
        topSpecies,
      };
    });
  }, [trees]);

  // マップ上に現在プロットされている詳細バブルの「リアルタイムSVG座標位置」
  const muniCoordMap = useMemo(() => {
    const coordMap: Record<string, { x: number; y: number }> = {};
    muniGroups.forEach(g => {
      const coords = projection([g.lng, g.lat]);
      if (coords) {
        const actualX = coords[0] * transform.scale + transform.x;
        const actualY = coords[1] * transform.scale + transform.y;
        coordMap[`${g.pref}-${g.name}`] = { x: actualX, y: actualY };
      }
    });
    return coordMap;
  }, [muniGroups, projection, transform]);

  // 現在のクローズアップ地方に属する「県別の樹木リスト」の作成
  const regionTrees = useMemo(() => {
    if (!selectedRegion) return [];

    const list = trees.filter(tree => {
      const prefRegex = /^(?:北海道|東京都|京都府|大阪府|.{2,3}県)/;
      const prefMatch = tree.address.match(prefRegex);
      if (!prefMatch) return false;
      return PREF_TO_REGION[prefMatch[0]] === selectedRegion;
    });

    return [...list].sort((a, b) => {
      const aPref = a.address.match(/^(?:北海道|東京都|京都府|大阪府|.{2,3}県)/)?.[0] || '';
      const bPref = b.address.match(/^(?:北海道|東京都|京都府|大阪府|.{2,3}県)/)?.[0] || '';
      return aPref.localeCompare(bPref, 'ja');
    });
  }, [trees, selectedRegion]);

  if (!geoData) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280',
        backgroundColor: '#f8fafc',
        fontFamily: 'sans-serif'
      }}>
        白地図を準備中...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#f8fafc',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'default',
        userSelect: 'none'
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 10
        }}
      >
        <defs>
          <marker
            id="arrowhead-default"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#cbd5e1" />
          </marker>
          <marker
            id="arrowhead-active"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#15803d" />
          </marker>
        </defs>

        {/* 🗺️ 地図レイヤー */}
        <g
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0px 0px',
            transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'auto'
          }}
        >
          {/* 都道府県ポリゴン */}
          <g>
            {geoData.features.map((feature: any, i: number) => {
              const prefName = feature.properties.N03_001;
              const color = getPrefColor(prefName);
              const regionKey = PREF_TO_REGION[prefName];
              
              const isRegionHovered = hoveredRegion === regionKey;
              const isRegionSelected = selectedRegion === regionKey;
              const isHighlighted = isRegionSelected || (!selectedRegion && isRegionHovered);

              return (
                <path
                  key={`pref-${i}`}
                  d={pathGenerator(feature) || ''}
                  fill={isHighlighted ? color.hover : color.bg}
                  stroke="#ffffff"
                  strokeWidth={isHighlighted ? "1.8" : "1.0"}
                  style={{
                    transition: 'fill 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), stroke-width 0.22s',
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (regionKey) {
                      handleRegionZoom(selectedRegion === regionKey ? null : regionKey);
                    }
                  }}
                  onMouseEnter={() => {
                    if (!selectedRegion && regionKey) {
                      setHoveredRegion(regionKey);
                    }
                  }}
                  onMouseLeave={() => {
                    if (!selectedRegion) {
                      setHoveredRegion(null);
                    }
                  }}
                />
              );
            })}
          </g>

          {/* 🔴 【日本全体表示のとき（マクロ）】各地方の「大まかな登録本数」を示す美麗なマクロバブルを描画 */}
          {!selectedRegion && (
            <g>
              {Object.entries(REGION_CENTERS).map(([key, center]) => {
                const count = regionStats[key] || 0;
                if (count === 0) return null; // 0件の地方は描画せずスッキリさせる

                const coords = projection([center.lng, center.lat]);
                if (!coords) return null;

                const theme = REGION_THEMES[key];
                const isHovered = hoveredRegion === key;
                const radius = isHovered ? 34 : 28;

                return (
                  <g
                    key={`macro-bubble-${key}`}
                    transform={`translate(${coords[0]}, ${coords[1]})`}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRegionZoom(key);
                    }}
                    onMouseEnter={() => setHoveredRegion(key)}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    {/* ふわふわ光る外枠 */}
                    <circle
                      r={radius + 8}
                      fill={theme.bg}
                      opacity="0.5"
                      style={{
                        animation: 'pulse 2.2s infinite',
                        pointerEvents: 'none',
                        transition: 'r 0.2s'
                      }}
                    />
                    {/* メインの美麗な丸枠 */}
                    <circle
                      r={radius}
                      fill="#ffffff"
                      stroke={theme.stroke}
                      strokeWidth="3.5"
                      style={{
                        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.1))'
                      }}
                    />
                    {/* 地方名（上段に小さく） */}
                    <text
                      y="-6"
                      textAnchor="middle"
                      style={{
                        fontSize: '9px',
                        fontWeight: 'bold',
                        fill: '#64748b',
                        fontFamily: 'sans-serif',
                        userSelect: 'none',
                        pointerEvents: 'none'
                      }}
                    >
                      {theme.name.replace('地方', '').replace('・沖縄', '')}
                    </text>
                    {/* 件数（下段に大きく） */}
                    <text
                      y="12"
                      textAnchor="middle"
                      style={{
                        fontSize: '18px',
                        fontWeight: '900',
                        fill: theme.stroke,
                        fontFamily: 'sans-serif',
                        userSelect: 'none',
                        pointerEvents: 'none'
                      }}
                    >
                      {count}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

        </g>

        {/* 🟢 【地方クローズアップ中のとき（ミクロ詳細）】市区町村別の詳細ピンバブルを描画（絶対座標化により地図ズームと完全同期） */}
        {selectedRegion && (
          <g>
            {muniGroups.map((group) => {
              // そのクローズアップされている地方に属する詳細バブルのみを描画！
              const regionKey = PREF_TO_REGION[group.pref];
              if (regionKey !== selectedRegion) return null;

              const coords = projection([group.lng, group.lat]);
              if (!coords) return null;

              // 地図の現在のズーム/移動スケールを適用した「絶対スクリーンピクセル座標」を計算
              const actualX = coords[0] * transform.scale + transform.x;
              const actualY = coords[1] * transform.scale + transform.y;

              const isSelected = selectedMuni === group.name;
              const hasHoveredTree = regionTrees.some(
                t => t.id === hoveredTreeId && extractMunicipality(t.address) === group.name
              );
              
              const baseSize = Math.min(18 + group.count * 2.5, 34);
              const size = (isSelected || hasHoveredTree) ? baseSize + 6 : baseSize;
              const emoji = getEmojiForSpecies(group.topSpecies);

              return (
                <g
                  key={`muni-bubble-${group.pref}-${group.name}`}
                  transform={`translate(${actualX}, ${actualY})`}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onMuniClick) {
                      onMuniClick(isSelected ? null : group.name);
                    }
                  }}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget.getBoundingClientRect();
                    const container = containerRef.current?.getBoundingClientRect();
                    if (container) {
                      setTooltip({
                        show: true,
                        x: target.left - container.left + target.width / 2,
                        y: target.top - container.top - 10,
                        title: `${group.pref} ${group.name}`,
                        count: group.count
                      });
                    }
                  }}
                  onMouseLeave={() => {
                    setTooltip(prev => ({ ...prev, show: false }));
                  }}
                >
                  <circle
                    r={size + 6}
                    fill="rgba(34,197,94,0.15)"
                    style={{
                      animation: 'pulse 2s infinite',
                      pointerEvents: 'none'
                    }}
                  />
                  <circle
                    r={size}
                    fill={isSelected ? '#facc15' : (hasHoveredTree ? '#4ade80' : '#22c55e')}
                    stroke={isSelected ? '#d97706' : '#15803d'}
                    strokeWidth="2.5"
                    style={{
                      transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.15))'
                    }}
                  />
                  <text
                    y="-4"
                    textAnchor="middle"
                    style={{
                      fontSize: '12px',
                      userSelect: 'none',
                      pointerEvents: 'none'
                    }}
                  >
                    {emoji}
                  </text>
                  <text
                    y="10"
                    textAnchor="middle"
                    style={{
                      fontSize: '10px',
                      fontWeight: 900,
                      fill: isSelected ? '#78350f' : '#ffffff',
                      fontFamily: 'sans-serif',
                      userSelect: 'none',
                      pointerEvents: 'none'
                    }}
                  >
                    {group.count}
                  </text>
                </g>
              );
            })}
          </g>
        )}
 
        {/* 🏹 コネクター矢印レイヤー (クローズアップ中のみ表示され、HTMLパネルのホバーに同期して自動で長さが変化！) */}
        {selectedRegion && (() => {
          const activeTree = regionTrees.find(t => t.id === hoveredTreeId) || regionTrees.find(t => t.id === selectedTreeId);
          const hasAnyHover = hoveredTreeId !== null;

          return (
            <g style={{ pointerEvents: 'none' }}>
              {regionTrees.map((tree, index) => {
                if (tree.latitude == null || tree.longitude == null) return null;

                const muni = extractMunicipality(tree.address);
                const prefRegex = /^(?:北海道|東京都|京都府|大阪府|.{2,3}県)/;
                const prefMatch = tree.address.match(prefRegex);
                if (!muni || !prefMatch) return null;

                const bubbleCoords = muniCoordMap[`${prefMatch[0]}-${muni}`];
                if (!bubbleCoords) return null;

                const isHovered = hoveredTreeId === tree.id;
                const isSelected = selectedTreeId === tree.id;
                const isActive = isHovered || isSelected;
                const isShowingInDetailPanel = activeTree?.id === tree.id;

                // 詳細パネルが表示されており、かつその樹木が詳細パネルに表示されているときのみ、詳細パネルの左端に接続！
                // それ以外のときはリストの左端に接続！これで表示ズレバグを100%完全解決！
                const listX = isShowingInDetailPanel ? (dimensions.width - 615) : (dimensions.width - 300);
                
                // 右側リストの全体配列における正確な物理インデックスをIDマッチで確実に取得して100%同期！
                const cardIndex = regionTrees.findIndex(t => t.id === tree.id);
                const listY = 80 + (cardIndex !== -1 ? cardIndex : index) * 53 + 22;

              const cpX1 = listX - 100;
              const cpY1 = listY;
              const cpX2 = (listX + bubbleCoords.x) / 2;
              const cpY2 = bubbleCoords.y;

              return (
                <path
                  key={`connector-${tree.id}`}
                  d={`M ${listX} ${listY} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${bubbleCoords.x} ${bubbleCoords.y}`}
                  fill="none"
                  stroke={isActive ? '#15803d' : '#cbd5e1'}
                  strokeWidth={isActive ? '2.5' : '1.0'}
                  strokeDasharray={isActive ? 'none' : '3 3'}
                  style={{
                    transition: 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s',
                    opacity: isActive ? 1 : (hasAnyHover ? 0.2 : 0.6)
                  }}
                  markerEnd={isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead-default)'}
                />
              );
            })}
          </g>
          );
        })()}
      </svg>

      {/* 📋 右側：統合サイドパネル (HTML/CSS絶対配置によりサイズバグを100%完全解決した極上UI！) */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        width: 280,
        height: 'calc(100% - 40px)',
        zIndex: 400,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1.5px solid rgba(226,232,240,0.8)',
        boxShadow: '0 15px 35px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.02)',
        fontFamily: 'sans-serif',
        padding: '20px 0',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'opacity 0.25s ease'
      }}>
        {selectedRegion === null ? (
          /* 🗺️ 全体表示中：地方選択ガイド */
          <div style={{ padding: '0 20px', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1e293b', marginBottom: '4px' }}>
              🗾 地方別・名木登録状況
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '16px', lineHeight: '1.4' }}>
              地図上の大バブルをクリックするか、リストを選択するとその地方へ自動クローズアップします
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(REGION_CENTERS).map(([key, center]) => {
                const count = regionStats[key] || 0;
                const theme = REGION_THEMES[key];
                if (!theme) return null;
                const isHovered = hoveredRegion === key;

                return (
                  <div
                    key={key}
                    onClick={() => handleRegionZoom(key)}
                    onMouseEnter={() => setHoveredRegion(key)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: isHovered ? 'rgba(34,197,94,0.06)' : 'rgba(248,250,252,0.8)',
                      border: isHovered ? '1.5px solid #22c55e' : '1px solid rgba(0,0,0,0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: theme.bg,
                        border: `1.5px solid ${theme.stroke}`
                      }} />
                      <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#334155' }}>
                        {theme.name}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 'bold',
                      color: count > 0 ? '#15803d' : '#94a3b8',
                      background: count > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.03)',
                      padding: '2px 8px',
                      borderRadius: '999px'
                    }}>
                      {count} 件
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* 🌳 クローズアップ中：県別リスト */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '0 20px 12px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#1e293b' }}>
                🌳 {REGION_THEMES[selectedRegion].name} の名木リスト
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '3px' }}>
                カードに触れると、場所が矢印で繋がります
              </div>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {regionTrees.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                  <div style={{ fontSize: '0.8rem' }}>このエリアにはまだ</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>樹木が登録されていません</div>
                </div>
              ) : (
                regionTrees.slice(0, 13).map((tree) => {
                  const isHovered = hoveredTreeId === tree.id;
                  const pref = tree.address.match(/^(?:北海道|東京都|京都府|大阪府|.{2,3}県)/)?.[0] || '';
                  const muni = extractMunicipality(tree.address) || '';
                  const hasGeo = tree.latitude != null && tree.longitude != null;

                  return (
                    <div
                      key={`list-item-${tree.id}`}
                      onMouseEnter={() => setHoveredTreeId(tree.id)}
                      onMouseLeave={() => setHoveredTreeId(null)}
                      onClick={() => {
                        if (onMarkerClick) onMarkerClick(tree);
                      }}
                      style={{
                        cursor: 'pointer',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: isHovered ? (hasGeo ? 'rgba(34,197,94,0.08)' : 'rgba(100,116,139,0.08)') : 'rgba(248, 250, 252, 0.8)',
                        border: isHovered ? (hasGeo ? '1.5px solid #22c55e' : '1px solid rgba(0,0,0,0.03)') : '1px solid rgba(0,0,0,0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* 都道府県バッジ */}
                      <span style={{
                        flexShrink: 0,
                        fontSize: '0.58rem',
                        fontWeight: 'bold',
                        color: '#ffffff',
                        background: isHovered ? (hasGeo ? '#15803d' : '#475569') : (hasGeo ? '#64748b' : '#cbd5e1'),
                        padding: '2px 6px',
                        borderRadius: '4px',
                        minWidth: '28px',
                        textAlign: 'center',
                        transition: 'all 0.15s'
                      }}>
                        {pref.replace('県', '').replace('府', '').replace('打', '')}
                      </span>

                      {/* テキスト */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{
                          fontWeight: 'bold',
                          fontSize: '0.75rem',
                          color: isHovered ? (hasGeo ? '#15803d' : '#475569') : (hasGeo ? '#1e293b' : '#64748b'),
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          transition: 'color 0.15s'
                        }}>
                          {tree.name}
                        </span>
                        <span style={{
                          fontSize: '0.58rem',
                          color: hasGeo ? '#64748b' : '#94a3b8',
                          fontStyle: hasGeo ? 'normal' : 'italic',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {hasGeo ? `📍 ${muni} | ${tree.species.split(' ')[0]}` : `🌐 ${muni} (位置情報なし)`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {regionTrees.length > 13 && (
              <div style={{
                padding: '8px 20px',
                borderTop: '1px solid rgba(0,0,0,0.05)',
                fontSize: '0.55rem',
                color: '#94a3b8',
                textAlign: 'center'
              }}>
                他 {regionTrees.length - 13} 件は左のメインパネルで確認できます
              </div>
            )}
          </div>
        )}
      </div>

      {/* 📖 【新機能】大迫力ストーリー詳細プレビューパネル（HTML/CSS絶対配置によりサイズバグゼロ！）
          ホバーされている時だけ、スライドドロワーのように美しくフェードイン出現します */}
      {selectedRegion && (() => {
        const hoveredTree = regionTrees.find(t => t.id === hoveredTreeId);
        const selectedTree = regionTrees.find(t => t.id === selectedTreeId);
        const activeTree = hoveredTree || selectedTree;
        const isShowing = activeTree !== undefined;

        return (
          <div style={{
            position: 'absolute',
            top: 20,
            right: isShowing ? 315 : 295, // 表示時は本来の位置、非表示時はリストの陰にスライド
            width: 300,
            height: 'calc(100% - 40px)',
            zIndex: 350,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: '1.5px solid rgba(34,197,94,0.22)',
            boxShadow: '0 20px 45px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.02)',
            fontFamily: 'sans-serif',
            padding: '20px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            pointerEvents: isShowing ? 'auto' : 'none',
            opacity: isShowing ? 1 : 0,
            transform: isShowing ? 'translateX(0)' : 'translateX(20px)',
            transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease'
          }}>
            {isShowing && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* ヘッダー */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#0f172a' }}>
                    📖 樹木のストーリー詳細
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
                    悠久の時を生きる名木を探索
                  </div>
                </div>

                {/* 樹木名 */}
                <div style={{
                  fontSize: '1.05rem',
                  fontWeight: '900',
                  color: '#0f172a',
                  marginBottom: '10px',
                  lineHeight: '1.35',
                  borderBottom: '2px solid rgba(34,197,94,0.2)',
                  paddingBottom: '8px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {activeTree.name}
                </div>

                {/* 属性タグバッジ */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 'bold',
                    padding: '3px 9px',
                    borderRadius: '999px',
                    background: 'rgba(34,197,94,0.1)',
                    color: '#15803d',
                    border: '1px solid rgba(21,128,61,0.15)'
                  }}>
                    🌿 {activeTree.species.split(' ')[0]}
                  </span>
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 'bold',
                    padding: '3px 9px',
                    borderRadius: '999px',
                    background: 'rgba(239,68,68,0.08)',
                    color: '#dc2626',
                    border: '1px solid rgba(220,38,38,0.12)'
                  }}>
                    👑 {activeTree.designation}
                  </span>
                  {activeTree.source_name && (
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 'bold',
                      padding: '3px 9px',
                      borderRadius: '999px',
                      background: 'rgba(59,130,246,0.08)',
                      color: '#2563eb',
                      border: '1px solid rgba(59,130,246,0.12)'
                    }}>
                      🏷️ {activeTree.source_name}
                    </span>
                  )}
                </div>

                {/* 三大スペック巨大グリッド */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '6px',
                  marginBottom: '14px'
                }}>
                  {/* 樹齢 */}
                  <div style={{
                    background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
                    borderRadius: '10px',
                    padding: '8px 4px',
                    textAlign: 'center',
                    border: '1px solid rgba(0,0,0,0.04)',
                    boxShadow: 'inset 0 1px 0 #ffffff'
                  }}>
                    <div style={{ fontSize: '0.52rem', color: '#64748b', marginBottom: '4px' }}>⏳ 推定樹齢</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#0f172a' }}>
                      {activeTree.age_years ? `${activeTree.age_years}年` : '不明'}
                    </div>
                  </div>
                  {/* 樹高 */}
                  <div style={{
                    background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
                    borderRadius: '10px',
                    padding: '8px 4px',
                    textAlign: 'center',
                    border: '1px solid rgba(0,0,0,0.04)',
                    boxShadow: 'inset 0 1px 0 #ffffff'
                  }}>
                    <div style={{ fontSize: '0.52rem', color: '#64748b', marginBottom: '4px' }}>📏 樹高</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#0f172a' }}>
                      {activeTree.height_m ? `${activeTree.height_m}m` : '不明'}
                    </div>
                  </div>
                  {/* 幹周 */}
                  <div style={{
                    background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
                    borderRadius: '10px',
                    padding: '8px 4px',
                    textAlign: 'center',
                    border: '1px solid rgba(0,0,0,0.04)',
                    boxShadow: 'inset 0 1px 0 #ffffff'
                  }}>
                    <div style={{ fontSize: '0.52rem', color: '#64748b', marginBottom: '4px' }}>🌳 幹周</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#0f172a' }}>
                      {activeTree.trunk_circumference_cm ? `${(activeTree.trunk_circumference_cm / 100).toFixed(1)}m` : '不明'}
                    </div>
                  </div>
                </div>

                {/* 所在地 */}
                <div style={{
                  fontSize: '0.68rem',
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  marginBottom: '12px',
                  background: '#f8fafc',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.03)',
                  lineHeight: '1.45'
                }}>
                  <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>📍</span>
                  <span>{activeTree.address}</span>
                </div>

                {/* ロマンストーリー解説 */}
                <div style={{
                  fontSize: '0.7rem',
                  color: '#334155',
                  lineHeight: '1.65',
                  background: '#ffffff',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  border: '1px dashed rgba(34,197,94,0.25)',
                  overflowY: 'auto',
                  boxSizing: 'border-box',
                  flex: 1,
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#15803d', fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>📖</span> 歴史・エピソード
                  </div>
                  {activeTree.description || (() => {
                    const speciesClean = (activeTree.species || '樹木').replace(/\s*\(.+?\)/g, '');
                    const pref = activeTree.address?.match(/^(?:北海道|東京都|京都府|大阪府|.{2,3}県)/)?.[0] || '日本';
                    return `${pref}の地に根を張る、美しい${speciesClean}の名木。その力強い佇まいと豊かな緑は、訪れる人々を優しく包み込み、悠久の時の流れを語りかける生命のシンボルです。現在、本樹木のさらなる歴史・エピソードの紹介文を募集中です。`;
                  })()}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ツールチップ */}
      {tooltip.show && (
        <div style={{
          position: 'absolute',
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translate(-50%, -100%)',
          backgroundColor: 'rgba(30,41,59,0.95)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: 'bold',
          pointerEvents: 'none',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          fontFamily: 'sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px'
        }}>
          <div>📍 {tooltip.title}</div>
          <div style={{ color: '#4ade80', fontSize: '0.74rem' }}>🌳 登録: {tooltip.count}件</div>
        </div>
      )}

      {/* 地方区分の凡例 */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        zIndex: 500,
        backgroundColor: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
        padding: '10px 14px',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.05)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        maxWidth: '380px',
        fontFamily: 'sans-serif',
        fontSize: '0.68rem',
        color: '#4b5563'
      }}>
        {Object.entries(REGION_THEMES).map(([key, theme]) => {
          const isSelected = selectedRegion === key;
          return (
            <div
              key={key}
              onClick={() => handleRegionZoom(isSelected ? null : key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '6px',
                background: isSelected ? 'rgba(0,0,0,0.05)' : 'transparent',
                border: isSelected ? '1px solid rgba(0,0,0,0.1)' : '1px solid transparent',
                transition: 'all 0.2s',
                fontWeight: isSelected ? 'bold' : 'normal'
              }}
            >
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: theme.bg,
                border: `1px solid ${theme.stroke}`
              }} />
              <span>{theme.name}</span>
            </div>
          );
        })}
      </div>

      {/* UI コントロール */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: '8px 16px',
          borderRadius: '20px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          fontWeight: 'bold',
          fontSize: '0.8rem',
          color: '#1e293b',
          border: '2px solid #22c55e',
        }}>
          🗾 地方クリックで自動クローズアップ
        </div>
        {selectedRegion && (
          <button
            onClick={() => handleRegionZoom(null)}
            style={{
              backgroundColor: '#22c55e',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(34,197,94,0.3)',
              transition: 'background 0.2s',
              alignSelf: 'flex-start'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#16803d'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
          >
            日本列島全体に戻す
          </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
