#!/usr/bin/env python3
"""Download the plain-text extract of Wikipedia articles for the fact check. Usage: python3 fetch_articles.py LIST OUTDIR
LIST has one article title per line. One file per title (slashes replaced); skips titles already saved; 6 s between
requests, backs off on HTTP 429 (Wikimedia rate-limits this machine)."""
import json, os, sys, time, urllib.parse, urllib.request
lst, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
UA = 'PinpointFactCheck/1.0 (educational geography game; https://github.com/maxw2712-blip/maxw2712-blip.github.io)'
for title in [l.strip() for l in open(lst, encoding='utf-8') if l.strip()]:
    path = os.path.join(out, title.replace('/', '_') + '.txt')
    if os.path.exists(path): continue
    url = 'https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'prop': 'extracts', 'explaintext': 1, 'titles': title, 'redirects': 1, 'format': 'json', 'formatversion': 2})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as r:
                page = json.load(r)['query']['pages'][0]
            open(path, 'w', encoding='utf-8').write(page.get('extract') or ('MISSING ' + title)); print('ok', title, flush=True); break
        except urllib.error.HTTPError as e:
            print('retry', title, e.code, flush=True); time.sleep(30 * (attempt + 1))
        except Exception as e:
            print('retry', title, type(e).__name__, flush=True); time.sleep(15)
    time.sleep(6)
print('done', flush=True)
