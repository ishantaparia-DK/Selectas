-- Tastemaker schema.
-- Design rules:
--   * Tables are read-only to clients (row level security). All writes go through the
--     functions below, so the rules cannot be bypassed by a modified app.
--   * One song per sender per local day is enforced by a unique index.
--   * Messages must match rows in note_options, so free text cannot be sent.

create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 30),
  emoji text not null default '😎' check (char_length(emoji) between 1 and 12),
  color text not null default '#FFC93C' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
-- One row per pair of people, whichever way round the request went.
create unique index friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table public.push_tokens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

create table public.note_options (
  kind text not null,
  key text not null,
  value text not null,
  primary key (kind, key, value)
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  song_title text not null check (char_length(song_title) between 1 and 120),
  song_artist text not null check (char_length(song_artist) between 1 and 120),
  song_url text not null check (char_length(song_url) <= 600),
  song_service text not null
    check (song_service in ('spotify', 'apple', 'youtube', 'soundcloud', 'tidal', 'bandcamp', 'deezer', 'amazon')),
  song_artwork text check (song_artwork is null or (char_length(song_artwork) <= 600 and song_artwork ~ '^https://')),
  note jsonb not null,
  sent_day date not null,
  sent_at timestamptz not null default now(),
  bucket text check (bucket in ('love', 'fine', 'nope')),
  score numeric(3, 1) check (score between 0 and 10),
  reaction text,
  rated_at timestamptz,
  sender_seen_at timestamptz,
  check (from_id <> to_id),
  -- The core rule: one song per sender per local day.
  constraint one_song_per_day unique (from_id, sent_day)
);
create index deliveries_to_idx on public.deliveries (to_id, sent_at desc);
create index deliveries_from_idx on public.deliveries (from_id, sent_at desc);

-- Each user's personal ranking of songs they rated. position 0 is best within a bucket.
create table public.rankings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  delivery_id uuid not null references public.deliveries (id) on delete cascade,
  bucket text not null check (bucket in ('love', 'fine', 'nope')),
  position int not null check (position >= 0),
  primary key (user_id, delivery_id)
);
create index rankings_bucket_idx on public.rankings (user_id, bucket, position);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.are_friends(a uuid, b uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- You can see your own profile, and the profile of anyone you share a friendship
-- (pending or accepted) or a delivery with. Nobody else.
create function public.can_see_profile(p_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select p_id = auth.uid()
    or exists (
      select 1 from public.friendships f
      where (f.requester_id = auth.uid() and f.addressee_id = p_id)
         or (f.addressee_id = auth.uid() and f.requester_id = p_id)
    )
    or exists (
      select 1 from public.deliveries d
      where (d.from_id = auth.uid() and d.to_id = p_id)
         or (d.to_id = auth.uid() and d.from_id = p_id)
    );
$$;

-- Mirrors the link check in src/lib/links.ts. Stops a sender attaching an arbitrary link.
create function public.is_music_url(p_url text, p_service text)
returns boolean
language plpgsql immutable
set search_path = ''
as $$
declare
  host text;
begin
  if p_url is null or p_url ~ '\s' or p_url !~* '^https?://' then
    return false;
  end if;
  host := lower(substring(p_url from '^[hH][tT][tT][pP][sS]?://([^/?#:]+)'));
  if host is null then
    return false;
  end if;
  return case p_service
    when 'spotify' then host ~ '(^|\.)spotify\.(com|link)$'
    when 'apple' then host ~ '(^|\.)(music|itunes)\.apple\.com$'
    when 'youtube' then host ~ '(^|\.)(youtube\.com|youtu\.be)$'
    when 'soundcloud' then host ~ '(^|\.)soundcloud\.com$'
    when 'tidal' then host ~ '(^|\.)tidal\.com$'
    when 'bandcamp' then host ~ '(^|\.)bandcamp\.com$'
    when 'deezer' then host ~ '(^|\.)(deezer\.com|deezer\.page\.link)$'
    when 'amazon' then host ~ '(^|\.)music\.amazon\.[a-z.]+$'
    else false
  end;
end;
$$;

-- A note may only contain known keys, and every value must come from note_options.
create function public.validate_note(p_note jsonb)
returns void
language plpgsql stable
set search_path = ''
as $$
declare
  k text;
  n numeric;
begin
  if p_note is null or jsonb_typeof(p_note) <> 'object' then
    raise exception 'invalid_note';
  end if;

  for k in select jsonb_object_keys(p_note) loop
    if k not in ('templateId', 'option', 'mood', 'bestFor', 'foundVia', 'bpm') then
      raise exception 'invalid_note';
    end if;
  end loop;

  if not exists (
    select 1 from public.note_options o
    where o.kind = 'template' and o.key = p_note ->> 'templateId' and o.value = p_note ->> 'option'
  ) then
    raise exception 'invalid_note';
  end if;

  if p_note ? 'mood' and not exists (
    select 1 from public.note_options o where o.kind = 'mood' and o.key = p_note ->> 'mood'
  ) then
    raise exception 'invalid_note';
  end if;

  if p_note ? 'bestFor' and not exists (
    select 1 from public.note_options o where o.kind = 'bestFor' and o.key = p_note ->> 'bestFor'
  ) then
    raise exception 'invalid_note';
  end if;

  if p_note ? 'foundVia' and not exists (
    select 1 from public.note_options o where o.kind = 'foundVia' and o.key = p_note ->> 'foundVia'
  ) then
    raise exception 'invalid_note';
  end if;

  if p_note ? 'bpm' then
    if jsonb_typeof(p_note -> 'bpm') <> 'number' then
      raise exception 'invalid_note';
    end if;
    n := (p_note ->> 'bpm')::numeric;
    if n < 40 or n > 220 or n <> trunc(n) then
      raise exception 'invalid_note';
    end if;
  end if;
end;
$$;

-- Rejects timezones Postgres does not know, so the daily rule cannot be broken by junk.
create function public.check_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform now() at time zone new.timezone;
  return new;
exception when others then
  raise exception 'invalid_timezone';
end;
$$;

create trigger profiles_check_timezone
  before insert or update of timezone on public.profiles
  for each row execute function public.check_timezone();

-- ---------------------------------------------------------------------------
-- Push notifications (Expo push service, called from the database via pg_net)
-- ---------------------------------------------------------------------------

create function public.notify_user(p_user uuid, p_title text, p_body text, p_data jsonb)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  msgs jsonb;
begin
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'to', t.token, 'title', p_title, 'body', p_body, 'data', p_data, 'sound', 'default'
    )),
    '[]'::jsonb
  ) into msgs
  from public.push_tokens t
  where t.user_id = p_user;

  if jsonb_array_length(msgs) > 0 then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := msgs,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json')
    );
  end if;
exception when others then
  -- A failed push must never block sending a song or rating one.
  null;
end;
$$;

create function public.on_delivery_insert()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  sender text;
begin
  select display_name into sender from public.profiles where id = new.from_id;
  perform public.notify_user(
    new.to_id,
    sender || ' sent you a song',
    'Tap to listen, then tell them how it landed.',
    jsonb_build_object('kind', 'received', 'deliveryId', new.id)
  );
  return new;
end;
$$;

create trigger deliveries_after_insert
  after insert on public.deliveries
  for each row execute function public.on_delivery_insert();

create function public.on_delivery_rated()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  rater text;
begin
  if old.rated_at is null and new.rated_at is not null then
    select display_name into rater from public.profiles where id = new.to_id;
    perform public.notify_user(
      new.from_id,
      rater || ' rated your song',
      'The verdict is in. Tap to see it.',
      jsonb_build_object('kind', 'rated', 'deliveryId', new.id)
    );
  end if;
  return new;
end;
$$;

create trigger deliveries_after_rate
  after update of rated_at on public.deliveries
  for each row execute function public.on_delivery_rated();

-- ---------------------------------------------------------------------------
-- Functions the app calls (the only way to write data)
-- ---------------------------------------------------------------------------

create function public.request_friend(p_username text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  target uuid;
  existing public.friendships;
  new_id uuid;
  my_name text;
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;

  select id into target from public.profiles where username = lower(trim(p_username));
  if target is null then
    raise exception 'user_not_found';
  end if;
  if target = me then
    raise exception 'cannot_friend_self';
  end if;

  select * into existing from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(me, target)
    and greatest(f.requester_id, f.addressee_id) = greatest(me, target);

  if found then
    if existing.status = 'accepted' then
      raise exception 'already_friends';
    end if;
    -- They already asked me, so asking back just accepts.
    if existing.addressee_id = me then
      update public.friendships set status = 'accepted' where id = existing.id;
      return existing.id;
    end if;
    raise exception 'already_requested';
  end if;

  insert into public.friendships (requester_id, addressee_id) values (me, target) returning id into new_id;

  select display_name into my_name from public.profiles where id = me;
  perform public.notify_user(
    target,
    my_name || ' wants to swap songs',
    'Open Friends to accept.',
    jsonb_build_object('kind', 'friend_request')
  );
  return new_id;
end;
$$;

create function public.respond_friend(p_id uuid, p_accept boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  f public.friendships;
  my_name text;
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;

  select * into f from public.friendships where id = p_id and addressee_id = me and status = 'pending';
  if not found then
    raise exception 'request_not_found';
  end if;

  if p_accept then
    update public.friendships set status = 'accepted' where id = p_id;
    select display_name into my_name from public.profiles where id = me;
    perform public.notify_user(
      f.requester_id,
      my_name || ' accepted your request',
      'You can send them a song now.',
      jsonb_build_object('kind', 'friend_accepted')
    );
  else
    delete from public.friendships where id = p_id;
  end if;
end;
$$;

create function public.send_song(
  p_to uuid,
  p_title text,
  p_artist text,
  p_url text,
  p_service text,
  p_artwork text,
  p_note jsonb
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  tz text;
  today date;
  new_id uuid;
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;
  if not public.are_friends(me, p_to) then
    raise exception 'not_friends';
  end if;
  if not public.is_music_url(p_url, p_service) then
    raise exception 'invalid_link';
  end if;
  perform public.validate_note(p_note);

  select timezone into tz from public.profiles where id = me;
  today := (now() at time zone tz)::date;

  begin
    insert into public.deliveries
      (from_id, to_id, song_title, song_artist, song_url, song_service, song_artwork, note, sent_day)
    values
      (me, p_to, trim(p_title), trim(p_artist), p_url, p_service, nullif(p_artwork, ''), p_note, today)
    returning id into new_id;
  exception when unique_violation then
    raise exception 'already_sent_today';
  end;

  return new_id;
end;
$$;

-- Records my rating, inserts the song into my personal ranking at the position the
-- app found through its "more or less than" comparisons, and returns the score.
-- Score ranges match src/lib/rating.ts.
create function public.rate_delivery(p_id uuid, p_bucket text, p_index int, p_reaction text)
returns numeric
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  d public.deliveries;
  n int;
  idx int;
  lo numeric;
  hi numeric;
  result numeric;
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;

  select * into d from public.deliveries where id = p_id for update;
  if not found or d.to_id <> me then
    raise exception 'delivery_not_found';
  end if;
  if d.rated_at is not null then
    raise exception 'already_rated';
  end if;

  if p_bucket not in ('love', 'fine', 'nope') then
    raise exception 'invalid_bucket';
  end if;
  if p_reaction is not null and not exists (
    select 1 from public.note_options o where o.kind = 'reaction' and o.key = p_reaction
  ) then
    raise exception 'invalid_reaction';
  end if;

  select count(*) into n from public.rankings where user_id = me and bucket = p_bucket;
  idx := least(greatest(coalesce(p_index, 0), 0), n);

  update public.rankings set position = position + 1
  where user_id = me and bucket = p_bucket and position >= idx;
  insert into public.rankings (user_id, delivery_id, bucket, position) values (me, p_id, p_bucket, idx);
  n := n + 1;

  if p_bucket = 'love' then lo := 6.7; hi := 10;
  elsif p_bucket = 'fine' then lo := 3.4; hi := 6.6;
  else lo := 0; hi := 3.3;
  end if;
  result := round(hi - ((idx + 0.5) / n) * (hi - lo), 1);

  update public.deliveries
  set bucket = p_bucket, score = result, reaction = p_reaction, rated_at = now()
  where id = p_id;

  return result;
end;
$$;

create function public.mark_seen(p_id uuid)
returns void
language sql security definer
set search_path = ''
as $$
  update public.deliveries
  set sender_seen_at = now()
  where id = p_id and from_id = auth.uid() and rated_at is not null and sender_seen_at is null;
$$;

create function public.register_push_token(p_token text)
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.push_tokens (user_id, token)
  values (auth.uid(), p_token)
  on conflict (user_id, token) do update set updated_at = now();
$$;

create function public.unregister_push_token(p_token text)
returns void
language sql security definer
set search_path = ''
as $$
  delete from public.push_tokens where user_id = auth.uid() and token = p_token;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.push_tokens enable row level security;
alter table public.note_options enable row level security;
alter table public.deliveries enable row level security;
alter table public.rankings enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated using (public.can_see_profile(id));
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy friendships_select on public.friendships
  for select to authenticated using (auth.uid() in (requester_id, addressee_id));
create policy friendships_delete on public.friendships
  for delete to authenticated using (auth.uid() in (requester_id, addressee_id));

create policy deliveries_select on public.deliveries
  for select to authenticated using (auth.uid() in (from_id, to_id));

create policy rankings_select on public.rankings
  for select to authenticated using (user_id = auth.uid());

create policy note_options_select on public.note_options
  for select to authenticated using (true);

-- push_tokens has no policies: clients use register_push_token / unregister_push_token.

-- Lock down who can call what. Clients are "authenticated"; "anon" can do nothing.
revoke all on all tables in schema public from anon;
revoke insert, update, delete on public.friendships, public.deliveries, public.rankings,
  public.note_options, public.push_tokens from authenticated;
revoke all on public.push_tokens from authenticated;
revoke delete on public.profiles from authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.request_friend(text),
  public.respond_friend(uuid, boolean),
  public.send_song(uuid, text, text, text, text, text, jsonb),
  public.rate_delivery(uuid, text, int, text),
  public.mark_seen(uuid),
  public.register_push_token(text),
  public.unregister_push_token(text)
to authenticated;

-- Policies call these helpers, so they must be callable by signed-in users.
grant execute on function public.can_see_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: lets the app show a reaction the moment a friend rates a song.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.deliveries, public.friendships;
  end if;
end;
$$;
