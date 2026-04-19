#!/usr/bin/env python3
"""
新日本の名木100選 スクレイパー
Scrapes http://www.tree-flower.jp/mokuji/list/shin_nihon_meiboku_100.htm
and extracts tree data from individual pages.
"""
import urllib.request
import re
import json
import time

BASE_URL = "http://www.tree-flower.jp"
INDEX_URL = f"{BASE_URL}/mokuji/list/shin_nihon_meiboku_100.htm"

def fetch(url, encoding='shift_jis'):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            raw = r.read()
        return raw.decode(encoding, errors='replace')
    except Exception as e:
        print(f"ERROR fetching {url}: {e}")
        return ""

def extract_links_from_index():
    html = fetch(INDEX_URL)
    # Find all href links to individual tree pages
    links = re.findall(r'href="(/\d+/[^"]+\.htm[l]?)"', html)
    # Deduplicate, keep order
    seen = set()
    result = []
    for l in links:
        if l not in seen:
            seen.add(l)
            result.append(BASE_URL + l)
    return result

def extract_tree_data(url, html):
    data = {'source_url': url}
    
    # Title - try h1, title, or first prominent text
    title_m = re.search(r'<h1[^>]*>([^<]+)</h1>', html)
    if title_m:
        data['name'] = title_m.group(1).strip()
    else:
        title_m = re.search(r'<title>([^<]+)</title>', html)
        if title_m:
            t = title_m.group(1).strip()
            # Remove site name suffix
            t = re.sub(r'\s*[|｜]\s*.*$', '', t).strip()
            data['name'] = t
    
    # Try to get species from content
    species_patterns = [
        r'樹種[：:]\s*([^\s<\n]+)',
        r'<td[^>]*>樹種</td>\s*<td[^>]*>([^<]+)</td>',
    ]
    for pat in species_patterns:
        m = re.search(pat, html)
        if m:
            data['species'] = m.group(1).strip()
            break
    
    # Try to extract coordinates from Google Maps links or meta
    coord_m = re.search(r'q=([0-9.]+),([0-9.]+)', html)
    if coord_m:
        data['latitude'] = float(coord_m.group(1))
        data['longitude'] = float(coord_m.group(2))
    
    # Height
    h_m = re.search(r'樹高[^\d]*([0-9.]+)\s*[mｍ]', html)
    if h_m:
        data['height_m'] = float(h_m.group(1))
    
    # Trunk circumference
    t_m = re.search(r'幹周[^0-9]*([0-9.]+)\s*[mｍ]', html)
    if t_m:
        val = float(t_m.group(1))
        data['trunk_circumference_cm'] = int(val * 100)
    else:
        t_m = re.search(r'幹囲[^0-9]*([0-9.]+)\s*[mｍ]', html)
        if t_m:
            val = float(t_m.group(1))
            data['trunk_circumference_cm'] = int(val * 100)
    
    # Age
    age_m = re.search(r'樹齢[^\d]*([0-9,]+)\s*年', html)
    if age_m:
        data['age_years'] = int(age_m.group(1).replace(',', ''))
    
    # Address - look for prefecture/city patterns
    addr_m = re.search(r'所在地[：:\s]*([^\s<\n（]+(?:県|都|道|府)[^\s<\n]*)', html)
    if addr_m:
        data['address'] = addr_m.group(1).strip()
    
    return data

def main():
    print("Fetching index page...")
    links = extract_links_from_index()
    print(f"Found {len(links)} tree pages")
    
    trees = []
    for i, url in enumerate(links):
        print(f"[{i+1}/{len(links)}] {url}")
        html = fetch(url)
        if not html:
            continue
        data = extract_tree_data(url, html)
        trees.append(data)
        time.sleep(0.5)  # be polite
    
    # Save raw data
    with open('/Users/shimamurakenji/アプリ開発/jumoku-map/scripts/meiboku_raw.json', 'w', encoding='utf-8') as f:
        json.dump(trees, f, ensure_ascii=False, indent=2)
    
    print(f"\nDone! Saved {len(trees)} trees to meiboku_raw.json")
    print("\nSample entries:")
    for t in trees[:3]:
        print(json.dumps(t, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
