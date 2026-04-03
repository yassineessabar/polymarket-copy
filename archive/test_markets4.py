import requests

# Use events endpoint with text search
keywords = {
    'politics': ['election', 'president', 'congress', 'vote'],
    'sports': ['NBA', 'NFL', 'FIFA', 'vs.'],
    'crypto': ['Bitcoin', 'Ethereum', 'crypto', 'BTC'],
    'trump': ['Trump'],
}

for cat, terms in keywords.items():
    print('=== %s ===' % cat)
    for term in terms[:1]:  # just try first keyword
        r = requests.get('https://gamma-api.polymarket.com/events', params={
            'active': 'true', 'closed': 'false',
            'title_contains': term, 'limit': '5',
            'order': 'volume24hr', 'ascending': 'false'
        }, timeout=10)
        events = r.json()
        # Check if results actually contain the term
        matching = [e for e in events if term.lower() in e.get('title', '').lower()]
        all_titles = [e.get('title', '')[:50] for e in events[:3]]
        print('  search "%s": %d events, %d matching' % (term, len(events), len(matching)))
        for t in all_titles:
            print('    - %s' % t)
    print()

# Try the events endpoint with slug
r = requests.get('https://gamma-api.polymarket.com/events', params={
    'active': 'true', 'closed': 'false', 'limit': '10',
    'order': 'volume24hr', 'ascending': 'false'
}, timeout=10)
print('=== Top 10 by volume ===')
for e in r.json()[:10]:
    title = e.get('title', '')[:55]
    slug = e.get('slug', '')[:30]
    mkts = len(e.get('markets', []))
    print('  %s (%d markets) slug=%s' % (title, mkts, slug))
