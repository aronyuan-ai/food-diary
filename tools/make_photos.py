"""照片對照檔：python3 -I make_photos.py stores.json reviews_dir posts_fixed.json import.json out.json"""
import json,sys,glob,os
stores_p,rdir,posts_p,imp_p,out_p=sys.argv[1:6]
S=json.load(open(stores_p)); P=json.load(open(posts_p)); imp=json.load(open(imp_p))
keep={s['id'] for s in imp['stores'] if s['status']!='not_store'}
R={}
for f in glob.glob(os.path.join(rdir,'*.json')):
    d=json.load(open(f)); R[d.get('id') or os.path.basename(f)[:-5]]=d.get('data',d)
merged={k:v['mergeInto'] for k,v in R.items() if v.get('status')=='merge' and v.get('mergeInto')}
def target(i):
    seen=set()
    while i in merged and i not in seen: seen.add(i); i=merged[i]
    return i
items=[];seen=set()
for s in S:
    sid=target(s['id'])
    if sid not in keep: continue
    for m in sorted(s['mentions'],key=lambda m:m['date'],reverse=True):
        ph=m['photos'][:6] if m['photos'] else ([m['photo']] if m['photo'] else [])
        ts=P[m['post']]['timestamp']
        for i,u in enumerate(ph):
            k=(sid,u)
            if k in seen: continue
            seen.add(k); items.append(dict(uri=u,store_id=sid,date=m['date'],fb_post_ts=ts,sort=i,guess=not m['photos']))
first={}
for it in items:
    if it['store_id'] not in first: first[it['store_id']]=it; it['cover']=True
json.dump(dict(version=1,items=items),open(out_p,'w'),ensure_ascii=False,separators=(',',':'))
print(len(items),'photos for',len(first),'stores; unique files',len({i['uri'] for i in items}),'guessed',sum(i['guess'] for i in items))
