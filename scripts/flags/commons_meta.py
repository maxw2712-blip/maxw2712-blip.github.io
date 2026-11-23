#!/usr/bin/env python3
"""Look up Wikimedia Commons files: licence, author, description and a 600 px render URL.
Usage: python3 -I commons_meta.py CANDS.py OUT.json   (CANDS.py defines C = {key: 'File name.svg'}; 25 titles per request,
6 s apart, generic User-Agent). Prints one line per file: licence | file | author | description."""
import json, re, sys, time, urllib.parse, urllib.request, importlib.util
UA = 'PinpointFlagSearch/1.0 (educational geography game; https://github.com/maxw2712-blip/maxw2712-blip.github.io)'
spec = importlib.util.spec_from_file_location('c', sys.argv[1]); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
files = sorted(set(f.replace('_', ' ') for f in m.C.values())); out = {}
for i in range(0, len(files), 25):
    ch = files[i:i+25]
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': 600, 'titles': '|'.join('File:' + f for f in ch), 'redirects': 1, 'format': 'json', 'formatversion': 2})
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as r: q = json.load(r)['query']
    red = {x['from'][5:]: x['to'][5:] for x in q.get('redirects', [])}; norm = {x['from'][5:]: x['to'][5:] for x in q.get('normalized', [])}
    pages = {p['title'][5:]: p for p in q['pages']}
    for f in ch:
        t = norm.get(f, f); t = red.get(t, t); p = pages.get(t, {})
        ii = (p.get('imageinfo') or [{}])[0]; em = ii.get('extmetadata', {})
        g = lambda k: re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', em.get(k, {}).get('value', ''))).strip()[:400]
        out[f] = {'title': t, 'missing': 'imageinfo' not in p, 'licence': g('LicenseShortName'), 'artist': g('Artist'), 'desc': g('ImageDescription'), 'thumb': ii.get('thumburl'), 'url': ii.get('url')}
    time.sleep(6)
json.dump(out, open(sys.argv[2], 'w'), indent=1, ensure_ascii=False)
for f, v in out.items(): print('MISSING' if v['missing'] else v['licence'], '|', f, '|', v['artist'][:40], '|', v['desc'][:170])
