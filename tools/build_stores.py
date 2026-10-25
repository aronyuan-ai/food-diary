"""從 FB 貼文 JSON（已修正編碼）建立店家清單。可重複執行，用於增量匯入。
用法: python3 -I build_stores.py posts_fixed.json name_cls.json out_dir [since=2020-01-01]"""
import json,re,sys,collections,datetime,hashlib
posts_p,cls_p,out=sys.argv[1:4]; since=sys.argv[4] if len(sys.argv)>4 else '2020-01-01'
d=json.load(open(posts_p)); cls=json.load(open(cls_p))
HOME='心肝甜蜜的家'
MEAL={'晚餐','午餐','早餐','點心','宵夜','消夜','下午茶','中午','晚上'}
def text(p): return '\n'.join(x.get('post','') for x in p.get('data',[]) if isinstance(x,dict))
def clean(raw): return re.sub(r'[\U0001F000-\U0001FFFF☀-➿️‍￼]+','',raw).strip('～~!！。，,、')
def norm(n):
    k=re.sub(r'(粉絲俱樂部|創始店|總店|本店|旗艦店|直營店|加盟店)','',n)
    k=re.split(r'\s*[-－|｜]\s*|\s{2,}',k)[0] if re.search(r'[一-鿿]',k) else k
    k2=re.sub(r"[A-Za-z'’&\.\s·・．()（）【】]+",'',k)
    k=k2 if len(k2)>=3 else re.sub(r'[\s·・．\.]','',k).lower()
    return k
COUNTRY=[('韓國',(33,39,124,131),r'首爾[^餐]|釜山[^餐]|弘大|明洞|聖水洞|仁川機場|金浦|海雲台|景福宮|廣藏市場|江南Style'),('日本',(24,46,123,146),r'名古屋|飛驒|白川鄉|合掌村|犬山城|中部國際機場|郡上八幡|鹿兒島|宮崎|飫肥'),
 ('澳門',(22.08,22.22,113.52,113.6),r'威尼斯人|巴黎人|倫敦人|官也街|大三巴|氹仔|議事亭'),('香港',(22.15,22.57,113.8,114.45),r'中環|尖沙咀|旺角|銅鑼灣|太平山|維多利亞港|昂坪|香港迪士尼|跑馬地|叮叮車'),
 ('中國',(18,54,73,135),r'陸家嘴|朱家角|上海迪士尼|黃浦江|南京路步行街|武康大樓|虹橋機場'),('越南',(8,24,102,110),r'峴港|會安|順化|巴拿山'),('澳洲',(-45,-10,110,155),r'雪梨|悉尼|澳洲|藍山|臥龍崗')]
def tw(c): return 21.8<c['latitude']<26.5 and 118.1<c['longitude']<122.1
def country_of(coord,t):
    if coord:
        if tw(coord): return '台灣'
        for n,(a,b,c,e),_ in COUNTRY:
            if a<coord['latitude']<b and c<coord['longitude']<e: return n
    for n,_,rx in COUNTRY:
        if re.search(rx,t): return n
    return None
CUISINE=[('火鍋',r'火鍋|鍋物|涮|麻辣鍋|麻辣燙|石頭火鍋|薑母鴨|羊肉爐|牛肉爐|酸菜白肉|shabu|壽喜燒|什鍋|鍋$|串串'),
 ('燒肉燒烤',r'燒肉|烤肉|燒烤|串燒|燒鳥|炭火|碳烤|BBQ|yakiniku'),('鐵板燒',r'鐵板燒|teppanyaki'),
 ('牛排',r'牛排|steak'),('日式',r'拉麵|壽司|日本料理|日式|居酒屋|丼|烏龍麵|和牛|炸豬排|定食|割烹|製麵|一風堂|丸龜|藏壽司|すき|食堂$'),
 ('韓式',r'韓式|韓國|韓食|韓餐|韓烤|韓鍋|參雞湯|炸雞|部隊鍋|飯捲|Bornga'),('東南亞',r'泰式|泰國|泰$|越南|河粉|船麵|南洋|米干|螺絲粉|酸辣粉'),
 ('港式',r'港式|茶餐廳|飲茶|燒鵝|燒臘|粥麵|雲吞|煲仔|冰室|港點|點心|牛腩'),
 ('咖啡甜點',r'咖啡|cafe|café|coffee|蛋糕|甜點|甜品|冰|豆花|愛玉|麵包|烘焙|烘培|布丁|蛋塔|塔$|派$|泡芙|司康|吐司|千層|甜甜圈|仙草|芋圓|粉圓|霜淇淋|冰淇淋|gelato|巧克力|餅乾|大福|蔴薯|麻糬|bakery|dessert'),
 ('飲料',r'茶$|紅茶|檸檬茶|手搖|喜茶|貢茶|果汁|冬瓜茶|杏仁茶|1點點'),
 ('餐酒館',r'餐酒|酒館|酒場|酒吧|bar|bistro|啤酒'),
 ('西式',r'美式|義式|義大利|法式|西餐|披薩|pizza|漢堡|早午餐|pasta|墨西哥|歐陸|Fridays|麥當勞|肯德雞|丹丹'),
 ('海鮮熱炒',r'熱炒|海鮮|海產|活海產|快炒|魚市場|蟹|蝦'),
 ('台菜客家',r'台菜|客家|客家菜|粄條|辦桌|古早味'),
 ('中式料理',r'川菜|川味|湘|上海|江浙|北平|粵|滬|烤鴨|浙江|雲南|四川|東北|小館|樓$|食府|宴|餐廳|料理'),
 ('麵食',r'麵|麪|米粉|水餃|餃|包子|鍋貼|湯包|小籠|餛飩|抄手|刀削|冬粉|粿仔|米苔目'),
 ('小吃',r'肉圓|臭豆腐|鹹酥雞|鹽酥雞|雞排|滷味|蚵仔煎|甜不辣|羹|焿|胡椒餅|蔥油餅|葱油餅|燒餅|餡餅|蔥抓餅|葱抓餅|潤餅|飯|便當|粥|豬腳|鵝肉|鴨|雞肉|米糕|碗粿|油飯|肉粽|粽|刈包|水煎包|煎包|玉米|蛋餅|四神湯|湯$|香腸|魚丸|小吃|夜市|豆漿|三明治|饅頭|燒賣')]
def cuisine(names):
    s=' '.join(names)
    for c,rx in CUISINE:
        if re.search(rx,s,re.I): return c
    return '未分類'
stores={}; mentions=[]
for pi,p in enumerate(d):
    ts=datetime.datetime.fromtimestamp(p['timestamp'])
    if str(ts.date())<since: continue
    t=text(p)
    media=[x['media']['uri'] for a in p.get('attachments',[]) for x in a['data'] if 'media' in x and not x['media']['uri'].endswith(('.mp4','.webp'))]
    places=[x['place'] for a in p.get('attachments',[]) for x in a['data'] if 'place' in x and x['place']['name']!=HOME]
    pcoord=places[0].get('coordinate') if places else None
    ctry=country_of(pcoord,t)
    items=[]
    for raw in re.findall(r'#([^\s#]+)',t):
        nm=clean(raw); m=re.match(r'(.+?)[（(]([^）)]+)[）)]$',nm)
        base,area=(m.group(1),m.group(2)) if m else (nm,'')
        if area in MEAL: area=''
        if cls.get(base)=='F': items.append(dict(name=base,district=area,src='tag'))
    for pl in places:
        if cls.get(pl['name'])=='F':
            items.append(dict(name=pl['name'],address=pl.get('address',''),coord=pl.get('coordinate'),src='checkin'))
    ntags=sum(1 for i in items if i['src']=='tag')
    ti=0
    for it in items:
        k=norm(it['name'])
        s=stores.setdefault(k,dict(names=collections.Counter(),districts=collections.Counter(),addresses=set(),coord=None,countries=collections.Counter(),mentions=[]))
        s['names'][it['name']]+=1
        if it.get('district'): s['districts'][it['district']]+=1
        if it.get('address'): s['addresses'].add(it['address'])
        if it.get('coord'): s['coord']=it['coord']
        c=country_of(it.get('coord'),'') or ctry
        if c: s['countries'][c]+=1
        photo=None
        if it['src']=='tag':
            off=max(0,len(media)-ntags)  # 多出來的照片視為封面放在前面
            if ntags>1 and len(media)>=ntags: photo=media[off+ti]
            ti+=1
        elif media: photo=media[0]
        s['mentions'].append(dict(post=pi,date=str(ts.date()),photo=photo,photos=media[:12] if ntags<=1 else [],snippet=re.sub(r'\s+',' ',t)[:90]))
# 前綴合併：短名稱 >=4 字
keys=sorted(stores,key=len); parent={}
for a in keys:
    if len(a)<4: continue
    for b in keys:
        if b!=a and len(b)>len(a) and b.startswith(a) and b not in parent: parent[b]=a
def root(k):
    while k in parent: k=parent[k]
    return k
groups=collections.defaultdict(list)
for k in stores: groups[root(k)].append(k)
res=[]
for r,ks in groups.items():
    S=[stores[k] for k in ks]
    names=sum((s['names'] for s in S),collections.Counter())
    dists=sum((s['districts'] for s in S),collections.Counter())
    ctr=sum((s['countries'] for s in S),collections.Counter())
    ms=sorted([m for s in S for m in s['mentions']],key=lambda m:m['date'])
    coord=next((s['coord'] for s in S if s['coord']),None)
    disp=max(names,key=lambda n:(names[n],-len(n)))
    sid=hashlib.md5(r.encode()).hexdigest()[:10]
    res.append(dict(id=sid,name=disp,aliases=sorted(set(names)-{disp}),district=dists.most_common(1)[0][0] if dists else '',
        addresses=sorted(set().union(*[s['addresses'] for s in S])),coord=coord,country=ctr.most_common(1)[0][0] if ctr else '台灣',
        cuisine=cuisine(list(names)),first=ms[0]['date'],last=ms[-1]['date'],visits=len({m['post'] for m in ms}),mentions=ms))
import os
ov_p=os.path.join(os.path.dirname(os.path.abspath(cls_p)),'cuisine_override.json')
ov=json.load(open(ov_p)) if os.path.exists(ov_p) else {}
for r in res:
    c=ov.get(r['id'])
    if c=='非店家': r['suggestNotStore']=True
    elif c: r['cuisine']=c
res.sort(key=lambda s:s['last'],reverse=True)
json.dump(res,open(out+'/stores.json','w'),ensure_ascii=False,indent=1)
print('stores',len(res)); print(collections.Counter(s['country'] for s in res)); print(collections.Counter(s['cuisine'] for s in res))
print('coord',sum(1 for s in res if s['coord']),'district',sum(1 for s in res if s['district'] and not s['coord']))
