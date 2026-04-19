'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import type { Tree } from '@/types';

interface MapProps {
  trees: Tree[];
  onMarkerClick: (tree: Tree) => void;
  selectedTreeId?: string;
  onMapClick?: (lat: number, lng: number) => void;
}

const TILE_LAYERS = {
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    label: '🌍 標準',
  },
  dark: {
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    label: '🌑 ダーク',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    label: '🛰 衛星写真',
  },
} as const;

type TileKey = keyof typeof TILE_LAYERS;

function getDesignationColor(d: string) {
  if (d === '国指定') return '#f59e0b';
  if (d === '都道府県指定') return '#3b82f6';
  if (d === '市区町村指定') return '#8b5cf6';
  return '#6b7280';
}

export default function Map({ trees, onMarkerClick, selectedTreeId, onMapClick }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const [tileKey, setTileKey] = useState<TileKey>('standard');

  // 地図初期化
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;
    if (mapInstanceRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((mapRef.current as any)._leaflet_id) return;

    import('leaflet').then((L) => {
      if (!mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((mapRef.current as any)._leaflet_id) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, {
        center: [36.5, 137.0],
        zoom: 6,
        zoomControl: true,
      });

      const layer = TILE_LAYERS.standard;
      tileLayerRef.current = L.tileLayer(layer.url, {
        attribution: layer.attribution,
        maxZoom: 19,
      }).addTo(map);

      if (onMapClick) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }

      mapInstanceRef.current = map;

      // コンテナサイズを再計算してタイル分割を防ぐ
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // タイル切り替え
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    import('leaflet').then((L) => {
      tileLayerRef.current.remove();
      const layer = TILE_LAYERS[tileKey];
      tileLayerRef.current = L.tileLayer(layer.url, {
        attribution: layer.attribution,
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    });
  }, [tileKey]);

  // マーカー更新
  useEffect(() => {
    if (typeof window === 'undefined' || !mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      trees.forEach((tree) => {
        if (tree.latitude == null || tree.longitude == null) return;

        const color = getDesignationColor(tree.designation);
        const isSelected = tree.id === selectedTreeId;
        const size = isSelected ? 44 : 34;
        const fontSize = isSelected ? '20px' : '16px';

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              width: ${size}px;
              height: ${size}px;
              background: rgba(7,15,7,0.88);
              border: 2.5px solid ${color};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${fontSize};
              box-shadow: 0 0 ${isSelected ? 20 : 8}px ${color}80, 0 2px 6px rgba(0,0,0,0.4);
              cursor: pointer;
              transition: all 0.2s;
            ">🌳</div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([tree.latitude, tree.longitude], { icon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div style="min-width:190px; font-family:sans-serif;">
              <div style="font-weight:700; font-size:1rem; margin-bottom:4px; color:#111;">${tree.name}</div>
              <div style="color:#16a34a; font-size:0.8rem; margin-bottom:4px;">${tree.species}</div>
              <div style="color:#555; font-size:0.74rem; margin-bottom:8px;">📍 ${tree.address}</div>
              ${tree.age_years ? `<div style="font-size:0.74rem; color:#16a34a; margin-bottom:6px;">🕐 推定樹齢 <strong>${tree.age_years.toLocaleString()}年</strong></div>` : ''}
              ${tree.source_name ? `<div style="font-size:0.68rem; background:#f0fdf4; color:#15803d; display:inline-block; padding:2px 8px; border-radius:999px; margin-bottom:8px;">${tree.source_name}</div>` : ''}
              <a href="/trees/${tree.id}" style="display:block; text-align:center; background:linear-gradient(135deg,#4ade80,#22c55e); color:#000; font-weight:700; font-size:0.8rem; padding:7px 12px; border-radius:999px; text-decoration:none;">詳細を見る →</a>
            </div>
          `, {
            maxWidth: 260,
          });

        marker.on('click', () => onMarkerClick(tree));
        markersRef.current.push(marker);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trees, selectedTreeId]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* タイル切り替えボタン */}
      <div style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 1000,
        display: 'flex',
        gap: 4,
        background: 'rgba(10,20,10,0.82)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(74,222,128,0.2)',
        borderRadius: 10,
        padding: '4px 6px',
      }}>
        {(Object.entries(TILE_LAYERS) as [TileKey, typeof TILE_LAYERS[TileKey]][]).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setTileKey(key)}
            style={{
              fontSize: '0.68rem',
              padding: '4px 10px',
              borderRadius: 7,
              border: 'none',
              background: tileKey === key ? 'rgba(74,222,128,0.2)' : 'transparent',
              color: tileKey === key ? '#4ade80' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontWeight: tileKey === key ? 700 : 400,
              transition: 'all 0.2s',
            }}
          >
            {val.label}
          </button>
        ))}
      </div>
    </div>
  );
}
