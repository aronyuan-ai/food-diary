"""合併 stores.json + geo_cache.json → 確認介面用的 stores_seed.json"""
import json,sys,re
stores_p,cache_p,out_p=sys.argv[1:4]
S=json.load(open(stores_p)); C=json.load(open(cache_p))
G=json.load(open(sys.argv[4])) if len(sys.argv)>4 else {}
def dnorm(d):
    d=d or ''
    if re.fullmatch(r'[一-鿿]{2}',d) and d not in ('遼寧','大直','長安','南京','永康','公館','西門','東門','龍山'): return d+'區'
    return d
out=[]
for s in S:
    g=C.get(s['id'],{})
    r=dict(id=s['id'],n=s['name'],al=s['aliases'][:4],co=s['country'],cu=s['cuisine'],f=s['first'],l=s['last'],v=s['visits'],
           hint=s['district'],m=[dict(d=m['date'],t=m['snippet']) for m in s['mentions'][-3:]][::-1])
    if s.get('suggestNotStore'): r['ns']=1
    if s['coord']:
        addr=next((a for a in s['addresses'] if len(a)>6),'') or g.get('address','')
        r['fb']=dict(lat=round(s['coord']['latitude'],6),lng=round(s['coord']['longitude'],6),a=addr,ci=g.get('city',''),di=g.get('district',''))
        r['conf']='high'
    elif s['id'] in G and G[s['id']]['c']:
        gm=G[s['id']]; cs=gm['c']; r['gAt']=gm['at']
        r['c']=[dict(g=c['gid'],s=c['s'],fd=c['fd'],lat=c['lat'],lng=c['lng'],ci=gm.get('ci','') if i==0 else '',di=gm.get('di','') if i==0 else '') for i,c in enumerate(cs)]
        c0=cs[0]; ok=c0['s']>=0.8 and c0['fd']
        r['pk']=0 if ok else -1
        r['conf']='high' if ok and c0['s']>=0.9 and (c0['dok'] or not s['district']) else ('mid' if ok else 'low')
    else:
        cs=g.get('cands',[])
        r['c']=[dict(n=c['name'],a=c['address'],ci=c['city'],di=c['district'],lat=round(c['lat'],6),lng=round(c['lng'],6),s=c['sim'],fd=c['food']) for c in cs]
        hd=dnorm(s['district']); pick=-1
        if cs:
            c0=cs[0]; dok=(not hd) or hd in (c0['district'],c0['city']) or (c0['district'] or '').startswith(hd[:2])
            if c0['sim']>=0.8 and dok and (c0['food'] or c0['sim']==1): pick=0
            r['conf']='high' if pick==0 and c0['sim']>=0.95 and (hd and dok) else ('mid' if pick==0 else 'low')
        else: r['conf']='low'
        r['pk']=pick
    out.append(r)
json.dump(out,open(out_p,'w'),ensure_ascii=False,separators=(',',':'))
import collections; print(len(out),collections.Counter(r['conf'] for r in out), sum(1 for r in out if r['id'] in C))
