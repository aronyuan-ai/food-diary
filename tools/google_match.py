"""用 Google Places Text Search 找每家店的地點 ID。
依 Google 條款：只永久保存 place ID；座標標記查詢日期（App 會在 30 天內重新整理）；
行政區改用 OpenStreetMap 依座標反查，不保存 Google 的店名或地址。可中斷續跑。"""
import json,sys,os,time,re,difflib,urllib.request,urllib.parse,datetime
stores_p,queue_p,out_p,key_p=sys.argv[1:5]
KEY=open(key_p).read().strip()
S={s['id']:s for s in json.load(open(stores_p))}; Q=json.load(open(queue_p))
out=json.load(open(out_p)) if os.path.exists(out_p) else {}
FOODT={'restaurant','food','cafe','bakery','bar','meal_takeaway','meal_delivery','coffee_shop','ice_cream_shop','dessert_shop','tea_house','fast_food_restaurant','night_club','food_court','confectionery','juice_shop','sandwich_shop'}
CN={'日本':'日本','韓國':'韓國','香港':'香港','澳門':'澳門','中國':'上海','越南':'越南','澳洲':'澳洲'}
def gsearch(q,region):
    body=dict(textQuery=q,languageCode='zh-TW',pageSize=3)
    if region: body['regionCode']=region
    req=urllib.request.Request('https://places.googleapis.com/v1/places:searchText',data=json.dumps(body).encode(),
        headers={'Content-Type':'application/json','X-Goog-Api-Key':KEY,'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.location,places.types'})
    with urllib.request.urlopen(req,timeout=20) as r: return json.load(r).get('places',[])
def osm_rev(lat,lng):
    u='https://photon.komoot.io/reverse?'+urllib.parse.urlencode(dict(lat=lat,lon=lng,limit=1))
    try:
        with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'personal-food-diary/1.0'}),timeout=20) as r:
            f=json.load(r)['features']; p=f[0]['properties'] if f else {}
        return p.get('city') or p.get('county') or p.get('state',''), p.get('district') or p.get('locality',''), p.get('countrycode','')
    except Exception: return '','',''
def nrm(x): return re.sub(r'[\s·・．\.\-－()（）【】&\'’]','',x).lower()
today=str(datetime.date.today()); n=0
for sid in Q:
    RETRY=os.environ.get('RETRY')
    if sid in out and not (RETRY and not out[sid]['c'] and not out[sid].get('retried')): continue
    s=S[sid]; tw=s['country']=='台灣'
    q=s['name']+((' '+s['district']) if s['district'] else '')+('' if tw else ' '+CN.get(s['country'],''))
    if RETRY: q=s['name']+(' 台灣' if tw else ' '+CN.get(s['country'],''))
    try: res=gsearch(q,'TW' if tw else None)
    except urllib.error.HTTPError as e:
        print('HTTP',e.code,e.read()[:200],flush=True)
        if e.code in (429,403): break
        continue
    except Exception as e: print('err',s['name'],e,flush=True); time.sleep(3); continue
    cands=[]
    for p in res:
        dn=p.get('displayName',{}).get('text','')
        a,b=nrm(s['name']),nrm(dn)
        sim=difflib.SequenceMatcher(None,a,b).ratio()
        if a and b and (a in b or b in a): sim=max(sim,0.9)
        food=bool(FOODT & set(p.get('types',[])))
        dok=bool(s['district']) and s['district'][:2] in p.get('formattedAddress','')
        loc=p.get('location',{})
        cands.append(dict(gid=p['id'],s=round(sim,2),fd=food,dok=dok,lat=round(loc.get('latitude',0),6),lng=round(loc.get('longitude',0),6)))
    cands.sort(key=lambda c:-(c['s']+0.15*c['fd']+0.1*c['dok']))
    rec=dict(c=cands,at=today)
    if RETRY: rec['retried']=1
    if cands:
        ci,di,cc=osm_rev(cands[0]['lat'],cands[0]['lng']); rec.update(ci=ci,di=di); time.sleep(1)
    out[sid]=rec; n+=1
    if n%25==0: json.dump(out,open(out_p,'w'),ensure_ascii=False); print(n,len(out),flush=True)
json.dump(out,open(out_p,'w'),ensure_ascii=False); print('done',len(out),flush=True)
