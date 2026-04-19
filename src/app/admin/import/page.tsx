'use client';

import { useState, useRef } from 'react';
import type { TreeInsert, Designation, SourceName } from '@/types';
import { SOURCE_NAMES } from '@/types';

// ===== CSV カラム定義 =====
const CSV_COLUMNS = [
  { key: 'name',                   label: '樹木名',      required: true },
  { key: 'species',                label: '樹種',        required: true },
  { key: 'latitude',               label: '緯度',        required: true },
  { key: 'longitude',              label: '経度',        required: true },
  { key: 'address',                label: '所在地',      required: true },
  { key: 'designation',            label: '指定区分',    required: false },
  { key: 'source_name',            label: 'データ区分',  required: false },
  { key: 'age_years',              label: '推定樹齢(年)', required: false },
  { key: 'height_m',               label: '樹高(m)',     required: false },
  { key: 'trunk_circumference_cm', label: '幹回り(cm)',  required: false },
  { key: 'description',            label: '説明',        required: false },
];

const TEMPLATE_CSV = CSV_COLUMNS.map(c => c.label).join(',') + '\n' +
  '来宮神社の大楠,クスノキ,35.1052,139.0748,静岡県熱海市西山町2-1,国指定,新日本名木100選,2000,26,2390,国指定天然記念物。幹周り23.9m。';

type ParsedRow = Partial<TreeInsert> & { _errors: string[]; _rowNum: number };
type ImportStatus = 'idle' | 'parsed' | 'importing' | 'done' | 'error';

const VALID_DESIGNATIONS: Designation[] = ['国指定', '都道府県指定', '市区町村指定', '無指定'];
const VALID_SOURCES: SourceName[] = [...SOURCE_NAMES];

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  // header は labels で受け取るが key にマップする
  const headerLabels = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
  const keyByLabel: Record<string, string> = {};
  CSV_COLUMNS.forEach(c => { keyByLabel[c.label] = c.key; });

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    // Simple CSV parse (respects quoted fields)
    const cells: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let ci = 0; ci < raw.length; ci++) {
      const ch = raw[ci];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cells.push(cur); cur = ''; }
      else { cur += ch; }
    }
    cells.push(cur);

    const errors: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: any = { _errors: errors, _rowNum: i };

    headerLabels.forEach((label, idx) => {
      const key = keyByLabel[label] ?? label;
      const val = (cells[idx] ?? '').trim();
      if (!val) { row[key] = null; return; }

      // number conversions
      if (['latitude', 'longitude', 'height_m'].includes(key)) {
        const n = parseFloat(val);
        row[key] = isNaN(n) ? null : n;
      } else if (['age_years', 'trunk_circumference_cm'].includes(key)) {
        const n = parseInt(val, 10);
        row[key] = isNaN(n) ? null : n;
      } else {
        row[key] = val;
      }
    });

    // Validation
    if (!row.name)      errors.push('樹木名は必須です');
    if (!row.species)   errors.push('樹種は必須です');
    if (!row.address)   errors.push('所在地は必須です');
    if (!row.latitude)  errors.push('緯度は必須です');
    if (!row.longitude) errors.push('経度は必須です');
    if (row.designation && !VALID_DESIGNATIONS.includes(row.designation)) {
      errors.push(`指定区分「${row.designation}」は無効です`);
      row.designation = '無指定';
    }
    if (row.source_name && !VALID_SOURCES.includes(row.source_name)) {
      errors.push(`データ区分「${row.source_name}」は無効です`);
      row.source_name = null;
    }
    if (!row.designation) row.designation = '無指定';

    rows.push(row as ParsedRow);
  }
  return rows;
}

export default function CSVImportPage() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [globalSource, setGlobalSource] = useState<SourceName>('新日本名木100選');
  const [overrideSource, setOverrideSource] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });
  const [importErrors, setImportErrors] = useState<{ row: number; msg: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
      setStatus('parsed');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const downloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'jumoku_template.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  const validRows = rows.filter(r => r._errors.length === 0);
  const errorRows = rows.filter(r => r._errors.length > 0);

  const startImport = async () => {
    if (validRows.length === 0) return;
    setStatus('importing');
    setImportErrors([]);
    const total = validRows.length;
    setProgress({ done: 0, total, errors: 0 });
    let errCount = 0;
    const errs: { row: number; msg: string }[] = [];

    for (let i = 0; i < validRows.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _errors, _rowNum, ...data } = validRows[i];
      if (overrideSource) data.source_name = globalSource;
      try {
        const res = await fetch('/api/trees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json();
          errs.push({ row: _rowNum, msg: err?.error ?? '登録失敗' });
          errCount++;
        }
      } catch (e) {
        errs.push({ row: _rowNum, msg: String(e) });
        errCount++;
      }
      setProgress({ done: i + 1, total, errors: errCount });
    }

    setImportErrors(errs);
    setStatus(errCount === 0 ? 'done' : 'error');
  };

  const reset = () => {
    setRows([]); setStatus('idle'); setProgress({ done: 0, total: 0, errors: 0 });
    setImportErrors([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <main style={{ paddingTop: 60, minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
            <a href="/" style={{ color: 'inherit' }}>← 地図に戻る</a>
          </div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.8rem', fontWeight: 700 }}>
            📥 CSVインポート
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: '0.9rem' }}>
            新日本名木100選・森の巨人たち100選などのデータをCSVで一括登録します
          </p>
        </div>

        {/* Step 1: Template + Upload */}
        <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
          <h2 className="section-heading">① テンプレートとファイル</h2>

          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as const }}>
            <button className="btn-secondary" onClick={downloadTemplate}>
              ⬇️ CSVテンプレートをダウンロード
            </button>
          </div>

          {/* Column reference */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>CSVカラム仕様：</p>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
              {CSV_COLUMNS.map(c => (
                <span key={c.key} style={{
                  fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999,
                  background: c.required ? 'rgba(74,222,128,0.12)' : 'var(--bg-glass)',
                  color: c.required ? 'var(--green-primary)' : 'var(--text-muted)',
                  border: `1px solid ${c.required ? 'rgba(74,222,128,0.3)' : 'var(--border-glass)'}`,
                }}>
                  {c.label}{c.required ? ' *' : ''}
                </span>
              ))}
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
              指定区分: 国指定 / 都道府県指定 / 市区町村指定 / 無指定　｜　
              データ区分: {SOURCE_NAMES.join(' / ')}
            </p>
          </div>

          {/* File upload */}
          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 12, padding: '28px 20px',
            border: '2px dashed var(--border-glass)', borderRadius: 12,
            cursor: 'pointer', transition: 'all 0.2s',
            background: 'rgba(74,222,128,0.02)',
          }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file && fileRef.current) {
                const dt = new DataTransfer(); dt.items.add(file);
                fileRef.current.files = dt.files;
                fileRef.current.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }}
          >
            <span style={{ fontSize: '2rem' }}>📂</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              CSVファイルをドロップ、またはクリックして選択
            </span>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile}
              style={{ display: 'none' }} />
          </label>
        </div>

        {/* Step 2: Global source override */}
        {status !== 'idle' && (
          <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
            <h2 className="section-heading">② データ区分の設定</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' as const }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={overrideSource}
                  onChange={e => setOverrideSource(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--green-primary)' }} />
                CSVの「データ区分」を上書きして一括設定する
              </label>
              {overrideSource && (
                <select
                  className="form-select"
                  value={globalSource}
                  onChange={e => setGlobalSource(e.target.value as SourceName)}
                  style={{ width: 'auto', minWidth: 200 }}
                >
                  {SOURCE_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {rows.length > 0 && status !== 'done' && (
          <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
            <h2 className="section-heading">
              ③ プレビュー
              <span style={{ marginLeft: 8, fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                合計 {rows.length} 行 ／ 正常 {validRows.length} 行 ／ エラー {errorRows.length} 行
              </span>
            </h2>

            {/* Error rows */}
            {errorRows.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.8rem', color: '#f87171', marginBottom: 8 }}>⚠️ 以下の行はスキップされます：</p>
                {errorRows.map(r => (
                  <div key={r._rowNum} style={{ fontSize: '0.78rem', padding: '6px 12px', background: 'rgba(239,68,68,0.07)', borderRadius: 6, marginBottom: 4 }}>
                    <span style={{ color: '#f87171', fontWeight: 700 }}>行 {r._rowNum}</span>
                    {' '}「{r.name ?? '名称なし'}」— {r._errors.join(' / ')}
                  </div>
                ))}
              </div>
            )}

            {/* Preview table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    {['行', '樹木名', '樹種', '所在地', '緯度', '経度', '指定区分', 'データ区分', '樹齢'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)', textAlign: 'left', whiteSpace: 'nowrap' as const }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validRows.slice(0, 20).map(r => (
                    <tr key={r._rowNum} style={{ borderBottom: '1px solid rgba(74,222,128,0.05)' }}>
                      <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{r._rowNum}</td>
                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>{r.name}</td>
                      <td style={{ padding: '6px 10px', color: 'var(--green-light)' }}>{r.species}</td>
                      <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>{r.address}</td>
                      <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{r.latitude}</td>
                      <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{r.longitude}</td>
                      <td style={{ padding: '6px 10px' }}>{r.designation}</td>
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{
                          fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999,
                          background: 'rgba(74,222,128,0.1)', color: 'var(--green-primary)',
                          border: '1px solid rgba(74,222,128,0.25)',
                        }}>
                          {overrideSource ? globalSource : (r.source_name ?? '—')}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{r.age_years ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {validRows.length > 20 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                  … 他 {validRows.length - 20} 行（プレビューは最初の20行のみ表示）
                </p>
              )}
            </div>
          </div>
        )}

        {/* Import progress */}
        {(status === 'importing' || status === 'done' || status === 'error') && (
          <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
            <h2 className="section-heading">④ インポート結果</h2>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                <span>{progress.done} / {progress.total} 件処理済み</span>
                <span style={{ color: progress.errors > 0 ? '#f87171' : 'var(--green-primary)' }}>
                  エラー: {progress.errors} 件
                </span>
              </div>
              <div style={{ background: 'var(--bg-glass)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, var(--green-primary), #22c55e)',
                  borderRadius: 999,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
            {status === 'done' && (
              <div style={{ padding: '12px 16px', background: 'rgba(74,222,128,0.08)', borderRadius: 8, color: 'var(--green-primary)', fontSize: '0.9rem' }}>
                ✅ {progress.done - progress.errors} 件のインポートが完了しました
              </div>
            )}
            {importErrors.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {importErrors.map((e, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', padding: '4px 10px', color: '#f87171' }}>
                    行 {e.row}: {e.msg}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' as const }}>
          {status !== 'idle' && (
            <button className="btn-secondary" onClick={reset}>
              🔄 リセット
            </button>
          )}
          {(status === 'done' || status === 'error') && (
            <a href="/" className="btn-primary">🗺️ 地図で確認する</a>
          )}
          {status === 'parsed' && validRows.length > 0 && (
            <button className="btn-primary" onClick={startImport}>
              🚀 {validRows.length} 件をインポート実行
            </button>
          )}
        </div>

      </div>
    </main>
  );
}
