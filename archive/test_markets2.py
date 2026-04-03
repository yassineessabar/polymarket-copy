import requests

# Try different search params
params_list = [
    ('tag_label', {'active': 'true', 'closed': 'false', 'tag_label': 'Politics', 'limit': '3'}),
    ('category', {'active': 'true', 'closed': 'false', 'category': 'Politics', 'limit': '3'}),
    ('slug_contains sports', {'active': 'true', 'closed': 'false', 'slug_contains': 'sports', 'limit': '3'}),
    ('title_contains trump', {'active': 'true', 'closed': 'false', 'title_contains': 'trump', 'limit': '3'}),
    ('title_contains bitcoin', {'active': 'true', 'closed': 'false', 'title_contains': 'bitcoin', 'limit': '3'}),
    ('title_contains FIFA', {'active': 'true', 'closed': 'false', 'title_contains': 'FIFA', 'limit': '3'}),
    ('tag=Sports', {'active': 'true', 'closed': 'false', 'tag': 'Sports', 'limit': '3'}),
]

for label, params in params_list:
    r = requests.get('https://gamma-api.polymarket.com/events', params=params, timeout=10)
    events = r.json()
    print('%s: %d events' % (label, len(events)))
    for e in events[:2]:
        print('  - %s' % e.get('title', '')[:60])
    print()
