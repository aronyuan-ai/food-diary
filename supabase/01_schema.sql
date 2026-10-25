-- 心肝美食帳：資料庫結構
-- 在 Supabase 的 SQL Editor 貼上全部內容，按 Run 一次即可。可重複執行。

-- 店家
create table if not exists public.stores (
  id               text primary key,
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name             text not null,
  aliases          text[] not null default '{}',
  cuisine          text,
  country          text default '台灣',
  city             text,
  district         text,
  address          text,                 -- 自己的地址（FB 打卡或手動填）；Google 的地址不存
  lat              double precision,     -- Google 來源的座標每 30 天內重新整理
  lng              double precision,
  loc_source       text check (loc_source in ('fb','google','osm','manual','none')),
  google_place_id  text,                 -- Google 條款允許永久保存的只有地點 ID
  google_fetched_at date,
  rating           numeric(2,1) check (rating is null or (rating between 0.5 and 5 and rating * 2 = floor(rating * 2))),
  status           text not null default 'unconfirmed' check (status in ('confirmed','unconfirmed','not_store')),
  merged_into      text references public.stores(id) on delete set null,
  note             text,
  first_visit      date,
  last_visit       date,
  visit_count      int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 每次造訪（FB 貼文或 App 新增）
create table if not exists public.visits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  store_id    text not null references public.stores(id) on delete cascade,
  visited_on  date not null,
  source      text not null default 'app' check (source in ('fb','app')),
  fb_post_ts  bigint,                    -- FB 貼文時間戳，用來避免重複匯入
  snippet     text,
  created_at  timestamptz not null default now(),
  unique (user_id, store_id, fb_post_ts)
);

-- 照片（檔案放在 Storage 的 photos 資料夾）
create table if not exists public.photos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  store_id    text not null references public.stores(id) on delete cascade,
  visit_id    uuid references public.visits(id) on delete set null,
  path        text not null,             -- photos/<user_id>/<檔名>.webp
  taken_on    date,
  sort        int not null default 0,
  is_cover    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists stores_user_idx  on public.stores(user_id);
create index if not exists visits_store_idx on public.visits(store_id);
create index if not exists photos_store_idx on public.photos(store_id);

-- 更新時間
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists stores_touch on public.stores;
create trigger stores_touch before update on public.stores for each row execute function public.touch_updated_at();

-- 只有本人能讀寫自己的資料
alter table public.stores enable row level security;
alter table public.visits enable row level security;
alter table public.photos enable row level security;

drop policy if exists "own stores" on public.stores;
create policy "own stores" on public.stores for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own visits" on public.visits;
create policy "own visits" on public.visits for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own photos" on public.photos;
create policy "own photos" on public.photos for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 照片儲存空間（私人）
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "own photo files" on storage.objects;
create policy "own photo files" on storage.objects for all to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
