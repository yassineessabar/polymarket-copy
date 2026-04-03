import requests

tags_map = {
    'politics': 'politics',
    'sports': 'sports',
    'crypto': 'crypto',
    'finance': 'finance',
    'trump': 'trump',
    'geopolitics': 'geopolitics',
}

for label, tag in tags_map.items():
    r = requests.get('https://gamma-api.polymarket.com/events', params={
        'active': 'true', 'closed': 'false', 'tag': tag, 'limit': '3'
    }, timeout=10)
    events = r.json()
    print('%s: %d events' % (label, len(events)))
    for e in events[:2]:
        print('  - %s' % e.get('title', '')[:50])
    print()

# trending by volume
r = requests.get('https://gamma-api.polymarket.com/events', params={
    'active': 'true', 'closed': 'false', 'limit': '5',
    'order': 'volume24hr', 'ascending': 'false'
}, timeout=10)
events = r.json()
print('trending: %d events' % len(events))
for e in events[:3]:
    mkts = e.get('markets', [])
    vol = sum(float(m.get('volume24hr', 0) or 0) for m in mkts)
    print('  - %s (vol: $%.0f)' % (e.get('title', '')[:50], vol))
