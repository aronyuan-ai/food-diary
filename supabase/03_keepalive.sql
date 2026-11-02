-- 心肝美食帳：防止 Supabase 免費專案被自動暫停
-- 2026-11 發現：只「讀」資料的定期連線不算使用，專案仍在 7 天後被暫停。
-- 改成每天由 GitHub 排程呼叫 heartbeat()，真的寫入一筆時間。
-- 在 Supabase 的 SQL Editor 貼上全部內容，按 Run 一次即可。可重複執行。

create table if not exists public.heartbeat (
  id  int primary key default 1 check (id = 1),   -- 只會有一列
  at  timestamptz not null default now(),
  n   bigint not null default 0
);
alter table public.heartbeat enable row level security;   -- 沒有任何政策：外部不能直接讀寫這張表

-- 唯一能動它的方法：呼叫這個函式，把時間更新成現在（不碰任何美食資料）
create or replace function public.heartbeat() returns timestamptz
language sql security definer set search_path = public as $$
  insert into public.heartbeat (id, at, n) values (1, now(), 1)
  on conflict (id) do update set at = now(), n = public.heartbeat.n + 1
  returning at;
$$;
revoke all on function public.heartbeat() from public;
grant execute on function public.heartbeat() to anon, authenticated;

select public.heartbeat();  -- 執行後應該看到現在的時間
