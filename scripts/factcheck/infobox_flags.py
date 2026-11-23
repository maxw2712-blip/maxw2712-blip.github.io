#!/usr/bin/env python3
"""Read the infobox flag/coat/symbol fields of Wikipedia articles. Usage: infobox_flags.py TITLES.py OUT.json
TITLES.py defines T = {key: article title}. 20 titles per request, 6 s apart."""
import json, re, sys, time, urllib.parse, urllib.request, importlib.util
UA = 'PinpointFlagSearch/1.0 (educational geography game; https://github.com/maxw2712-blip/maxw2712-blip.github.io)'
spec = importlib.util.spec_from_file_location('t', sys.argv[1]); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
T = m.T; out = {}
FIELDS = r'(image_flag\d?|flag_type\d?|flag_caption|image_coat|coa_type|symbol_type|image_symbol|symbol|flag|image_banner|flag_alt|coat_alt|symbol_caption|coa_caption)'
def get(titles):
    url = 'https://en.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main', 'titles': '|'.join(titles), 'redirects': 1, 'format': 'json', 'formatversion': 2})
    for a in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as r: return json.load(r)
        except Exception as e: print('retry', e, flush=True); time.sleep(30 * (a + 1))
    return {}
items = list(T.items())
for i in range(0, len(items), 20):
    chunk = items[i:i+20]; r = get([t for _, t in chunk]); q = r.get('query', {})
    norm = {x['from']: x['to'] for x in q.get('normalized', [])}; red = {x['from']: x['to'] for x in q.get('redirects', [])}
    pages = {p['title']: p for p in q.get('pages', [])}
    for k, t in chunk:
        tt = norm.get(t, t); tt = red.get(tt, tt); p = pages.get(tt, {})
        txt = p.get('revisions', [{}])[0].get('slots', {}).get('main', {}).get('content', '') if 'revisions' in p else ''
        head = txt[:15000]
        f = {}
        for ln in head.splitlines():
            mm = re.match(r'\s*\|\s*' + FIELDS + r'\s*=\s*(.*)$', ln)
            if mm and mm.group(2).strip() and not mm.group(2).strip().startswith('<!--'): f[mm.group(1)] = mm.group(2).strip()[:220]
            mm = re.match(r'\s*\|\s*([a-z_0-9]+)\s*=\s*(.*\.(?:svg|png|jpg|jpeg|gif|webp)\b.*)$', ln, re.I)
            if mm and re.search(r'flag|coat|symbol|banner|standard|emblem|seal|arms|s\d', mm.group(1)): f.setdefault('file_' + mm.group(1), mm.group(2).strip()[:220])
        out[k] = {'article': tt, 'missing': not txt, 'fields': f}
    print('ok', i, flush=True); time.sleep(6)
json.dump(out, open(sys.argv[2], 'w'), indent=1, ensure_ascii=False)
print('done')
