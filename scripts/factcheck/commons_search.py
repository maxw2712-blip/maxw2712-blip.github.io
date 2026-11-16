#!/usr/bin/env python3
"""Search Wikimedia Commons for flag/banner/standard/emblem/arms files of realms without a flag.
Usage: python3 commons_search.py NOFLAG.json OUT.json   (NOFLAG = {period: [[mapName, displayName, cap, region]]})
6 s between requests, backs off on HTTP 429. Saves after every realm, skips realms already in OUT."""
import json, os, re, sys, time, urllib.parse, urllib.request
UA = 'PinpointFlagSearch/1.0 (educational geography game; https://github.com/maxw2712-blip/pinpoint)'
src, outp = sys.argv[1], sys.argv[2]
out = json.load(open(outp)) if os.path.exists(outp) else {}
def api(params):
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(dict(params, format='json', formatversion=2))
    for attempt in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            print('retry', e.code, flush=True); time.sleep(30 * (attempt + 1))
        except Exception as e:
            print('retry', type(e).__name__, flush=True); time.sleep(15)
    return {}
data = json.load(open(src))
for p, rows in data.items():
    for mn, dn, cap, reg in rows:
        key = f'{p}|{dn}'
        if key in out: continue
        core = re.sub(r'\s*\(.*?\)', '', dn).strip()
        q = f'intitle:"{core}" filetype:drawing'
        r = api({'action': 'query', 'list': 'search', 'srnamespace': 6, 'srlimit': 20, 'srsearch': q})
        out[key] = [h['title'] for h in r.get('query', {}).get('search', [])]
        json.dump(out, open(outp, 'w'), indent=0, ensure_ascii=False)
        print('ok', key, len(out[key]), flush=True)
        time.sleep(6)
print('done', flush=True)
