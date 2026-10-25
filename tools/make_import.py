"""產生 App 匯入檔：python3 -I make_import.py stores.json seed.json reviews_dir posts_fixed.json out.json"""
import json,sys,glob,os,re
stores_p,seed_p,rdir,posts_p,out_p=sys.argv[1:6]
S=json.load(open(stores_p)); seed={x['id']:x for x in json.load(open(seed_p))}
P=json.load(open(posts_p))
R={}
for f in glob.glob(os.path.join(rdir,'*.json')):
    d=json.load(open(f)); R[d.get('id') or os.path.basename(f)[:-5]]=d.get('data',d)
def ptext(p): return '\n'.join(x.get('post','') for x in p.get('data',[]) if isinstance(x,dict))
SRC={'fb':'fb','google':'google','osm':'osm','manual':'manual','none':'none'}
stores={};visits=[];aliases_extra={}
merged={k:v['mergeInto'] for k,v in R.items() if v.get('status')=='merge' and v.get('mergeInto')}
def target(i):
    seen=set()
    while i in merged and i not in seen: seen.add(i); i=merged[i]
    return i
for s in S:
    sid=s['id']; r=R.get(sid,{}); sd=seed[sid]; tid=target(sid)
    for m in s['mentions']:
        p=P[m['post']]
        visits.append(dict(store_id=tid,visited_on=m['date'],source='fb',fb_post_ts=p['timestamp'],snippet=ptext(p)[:1200]))
    if tid!=sid:
        aliases_extra.setdefault(tid,set()).update([s['name'],*s['aliases']]); continue
    row=dict(id=sid,name=s['name'],aliases=s['aliases'],cuisine=s['cuisine'],country=s['country'],city=None,district=None,address=None,
             lat=None,lng=None,loc_source='none',google_place_id=None,google_fetched_at=None,status='unconfirmed',
             first_visit=s['first'],last_visit=s['last'],visit_count=s['visits'])
    if r.get('status')=='ok':
        row.update(status='confirmed',name=r.get('name') or s['name'],cuisine=r.get('cuisine') or s['cuisine'],country=r.get('country') or s['country'],
                   city=r.get('city') or None,district=r.get('district') or None,address=r.get('address') or None,lat=r.get('lat'),lng=r.get('lng'),
                   loc_source=SRC.get(r.get('locSource'),'none'),google_place_id=r.get('gid'),google_fetched_at=r.get('gAt'))
        if row['loc_source']=='fb' and not row['district'] and sd.get('fb'): row.update(city=sd['fb']['ci'] or None,district=sd['fb']['di'] or None)
    elif r.get('status')=='ns':
        row['status']='not_store'
    else:
        if sd.get('fb'):
            f=sd['fb']; row.update(lat=f['lat'],lng=f['lng'],address=f['a'] or None,city=f['ci'] or None,district=f['di'] or None,loc_source='fb')
        elif sd.get('pk',-1)>=0:
            c=sd['c'][sd['pk']]
            row.update(lat=c['lat'],lng=c['lng'],city=c.get('ci') or None,district=c.get('di') or None)
            if c.get('g'): row.update(loc_source='google',google_place_id=c['g'],google_fetched_at=sd.get('gAt'))
            else: row.update(loc_source='osm',address=c.get('a') or None)
        if not row['district'] and s['district']: row['district']=s['district']
    stores[sid]=row
for t,al in aliases_extra.items():
    if t in stores: stores[t]['aliases']=sorted(set(stores[t]['aliases'])|al-{stores[t]['name']})
# 依造訪重新計算
from collections import defaultdict
vd=defaultdict(list)
seenv=set();V=[]
for v in visits:
    k=(v['store_id'],v['fb_post_ts'])
    if k in seenv or v['store_id'] not in stores: continue
    seenv.add(k);V.append(v);vd[v['store_id']].append(v['visited_on'])
for sid,ds in vd.items():
    stores[sid].update(first_visit=min(ds),last_visit=max(ds),visit_count=len(ds))
json.dump(dict(version=1,stores=list(stores.values()),visits=V),open(out_p,'w'),ensure_ascii=False)
import collections
print(len(stores),len(V),collections.Counter(x['status'] for x in stores.values()),collections.Counter(x['loc_source'] for x in stores.values()))
