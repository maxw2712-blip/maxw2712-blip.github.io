#!/usr/bin/env python3
"""Download the wikitext of Wikipedia's 366 date pages ("January 1" ... "December 31") for the On this day fact check.
Saves one file per date in the given folder; skips dates already saved. Wikimedia rate-limits this machine, so it waits
6 s between requests and backs off on HTTP 429. Usage: python3 fetch_dates.py OUTDIR"""
import json, os, sys, time, urllib.parse, urllib.request, datetime
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
UA = 'PinpointFactCheck/1.0 (educational geography game; https://github.com/maxw2712-blip/maxw2712-blip.github.io)'
days = [datetime.date(2024, 1, 1) + datetime.timedelta(d) for d in range(366)]
for d in days:
    key = d.strftime('%m-%d'); path = os.path.join(out, key + '.txt')
    if os.path.exists(path): continue
    title = d.strftime('%B ') + str(d.day)
    url = 'https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'parse', 'page': title, 'prop': 'wikitext', 'format': 'json', 'formatversion': 2, 'redirects': 1})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as r:
                text = json.load(r)['parse']['wikitext']
            open(path, 'w', encoding='utf-8').write(text); print('ok', key, len(text), flush=True); break
        except urllib.error.HTTPError as e:
            print('retry', key, e.code, flush=True); time.sleep(30 * (attempt + 1))
        except Exception as e:
            print('retry', key, type(e).__name__, flush=True); time.sleep(15)
    time.sleep(6)
print('done', len(os.listdir(out)), flush=True)
