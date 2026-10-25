"""用 Photon (OpenStreetMap) 查詢地址候選，結果快取在 geo_cache.json，可中斷續跑。"""
import json,sys,time,urllib.request,urllib.parse,os,difflib
stores_p,cache_p=sys.argv[1:3]
S=json.load(open(stores_p))
cache=json.load(open(cache_p)) if os.path.exists(cache_p) else {}
BIAS={'台灣':(25.04,121.52),'韓國':(37.55,126.98),'日本':(35.17,136.9),'香港':(22.3,114.17),'澳門':(22.19,113.55),'中國':(31.23,121.47),'越南':(16.05,108.2),'澳洲':(-33.87,151.2)}
FOOD={'restaurant','cafe','fast_food','food_court','ice_cream','bar','pub','bakery','confectionery','pastry','deli','marketplace','tea','beverages','biergarten'}
def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':'personal-food-diary/1.0 (one-off batch, 1 req/s)'})
    with urllib.request.urlopen(req,timeout=20) as r: return json.load(r)
def addr(p):
    parts=[p.get('city') or p.get('county',''),p.get('district',''),p.get('street',''),p.get('housenumber','')]
    return ''.join(x for x in parts if x) if p.get('countrycode')=='TW' else ', '.join(x for x in [p.get('housenumber'),p.get('street'),p.get('district'),p.get('city'),p.get('country')] if x)
def search(q,lat,lon):
    u='https://photon.komoot.io/api/?'+urllib.parse.urlencode(dict(q=q,lat=lat,lon=lon,limit=6))
    return get(u)['features']
def reverse(lat,lon):
    u='https://photon.komoot.io/reverse?'+urllib.parse.urlencode(dict(lat=lat,lon=lon,limit=1))
    f=get(u)['features']; return f[0]['properties'] if f else {}
n=0
for s in S:
    k=s['id']
    if k in cache: continue
    try:
        if s['coord']:
            p=reverse(s['coord']['latitude'],s['coord']['longitude'])
            cache[k]=dict(kind='reverse',district=p.get('district',''),city=p.get('city',''),address=addr(p) if p else '')
        else:
            lat,lon=BIAS.get(s['country'],BIAS['台灣'])
            q=s['name']+(' '+s['district'] if s['district'] else '')
            feats=search(q,lat,lon)
            if not feats and s['district']: feats=search(s['name'],lat,lon); time.sleep(1)
            cands=[]
            for f in feats:
                p=f['properties']; nm=p.get('name','')
                if not nm: continue
                sim=difflib.SequenceMatcher(None,s['name'],nm).ratio()
                food=p.get('osm_value') in FOOD
                cands.append(dict(name=nm,address=addr(p),district=p.get('district',''),city=p.get('city',''),lat=f['geometry']['coordinates'][1],lng=f['geometry']['coordinates'][0],sim=round(sim,2),food=food))
            cands.sort(key=lambda c:(-(c['sim']+0.2*c['food'])))
            cache[k]=dict(kind='search',cands=cands[:3])
    except Exception as e:
        print('err',s['name'],e,flush=True); time.sleep(5); continue
    n+=1
    if n%25==0:
        json.dump(cache,open(cache_p,'w'),ensure_ascii=False); print(n,len(cache),flush=True)
    time.sleep(1.1)
json.dump(cache,open(cache_p,'w'),ensure_ascii=False); print('done',len(cache))
