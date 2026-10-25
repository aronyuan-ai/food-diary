-- 心肝美食帳：唯讀檢視者
-- 在 Supabase 的 SQL Editor 貼上全部內容，按 Run 一次即可。可重複執行。
-- 加入檢視者帳號的步驟在最下面（另一段，要改 Email）。

-- 檢視者名單：viewer 可以看 owner 的資料，但不能改
create table if not exists public.viewers (
  owner_id   uuid not null references auth.users(id) on delete cascade,
  viewer_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, viewer_id)
);
alter table public.viewers enable row level security;
drop policy if exists "see my viewer rows" on public.viewers;
create policy "see my viewer rows" on public.viewers for select to authenticated
  using (viewer_id = auth.uid() or owner_id = auth.uid());
-- 名單只能在 SQL Editor 裡改，App 裡沒有人能新增或刪除

-- 檢查「我是不是這份資料的檢視者」（security definer：不受 viewers 表權限影響，避免互相查詢卡住）
create or replace function public.can_view(owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select owner = auth.uid()
      or exists (select 1 from public.viewers v where v.owner_id = owner and v.viewer_id = auth.uid());
$$;

-- 讀取：本人或檢視者都可以；寫入：維持只有本人（01_schema.sql 的 "own ..." 政策不變）
drop policy if exists "viewer read stores" on public.stores;
create policy "viewer read stores" on public.stores for select to authenticated using (public.can_view(user_id));
drop policy if exists "viewer read visits" on public.visits;
create policy "viewer read visits" on public.visits for select to authenticated using (public.can_view(user_id));
drop policy if exists "viewer read photos" on public.photos;
create policy "viewer read photos" on public.photos for select to authenticated using (public.can_view(user_id));

-- 照片檔案：檢視者只能讀
drop policy if exists "viewer read photo files" on storage.objects;
create policy "viewer read photo files" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.can_view(((storage.foldername(name))[1])::uuid));


-- ===========================================================
-- 加入一位檢視者（先在 Authentication → Users → Add user 建好帳號）
-- 把下面的 viewer@example.com 換成那個帳號的 Email，只選取這一段再按 Run：
--
-- insert into public.viewers (owner_id, viewer_id)
-- select (select user_id from public.stores limit 1), id
-- from auth.users where email = 'viewer@example.com'
-- on conflict do nothing;
--
-- 移除檢視者：
-- delete from public.viewers where viewer_id = (select id from auth.users where email = 'viewer@example.com');
-- ===========================================================
