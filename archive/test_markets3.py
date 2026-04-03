import requests

# Try the markets endpoint instead of events
r = requests.get('https://gamma-api.polymarket.com/markets', params={
    'active': 'true', 'closed': 'false', 'limit': '3',
    'order': 'volume24hr', 'ascending': 'false'
}, timeout=10)
markets = r.json()
print('markets endpoint: %d results' % len(markets))
if markets:
    m = markets[0]
    print('Keys: %s' % list(m.keys())[:15])
    print('Tags: %s' % m.get('tags', ''))
    print('Category: %s' % m.get('category', ''))
    print('Question: %s' % m.get('question', '')[:60])
    print()

# Check what tags/categories are actually available
tags_seen = set()
categories_seen = set()
r = requests.get('https://gamma-api.polymarket.com/markets', params={
    'active': 'true', 'closed': 'false', 'limit': '50'
}, timeout=15)
for m in r.json():
    t = m.get('tags', [])
    if isinstance(t, list):
        tags_seen.update(t)
    elif isinstance(t, str) and t:
        tags_seen.update(t.split(','))
    c = m.get('category', '')
    if c:
        categories_seen.add(c)

print('Tags found: %s' % sorted(tags_seen)[:20])
print('Categories found: %s' % sorted(categories_seen)[:20])
