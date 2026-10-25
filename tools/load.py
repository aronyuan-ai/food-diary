import json,sys
def fix(o):
    if isinstance(o,str):
        try: return o.encode('latin1').decode('utf8')
        except Exception: return o
    if isinstance(o,list): return [fix(x) for x in o]
    if isinstance(o,dict): return {k:fix(v) for k,v in o.items()}
    return o
def load(p): return fix(json.load(open(p)))
