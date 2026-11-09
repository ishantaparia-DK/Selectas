// Runs the database rules in an in-memory Postgres (PGlite), with small stand-ins for the
// Supabase pieces (auth schema, roles, pg_net). Run with:  node supabase/tests/db.test.mjs
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const read = (f) => readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8');
const db = new PGlite();

// --- Stand-ins for what Supabase provides -------------------------------------------------
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  create schema net;
  create table public._push_log (url text, body jsonb);
  create function net.http_post(url text, body jsonb default '{}'::jsonb, headers jsonb default '{}'::jsonb)
    returns bigint language sql as $$ insert into public._push_log values (url, body); select 1::bigint $$;
  create publication supabase_realtime;
  grant usage on schema public, auth to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated, public;
`);

await db.exec(read('20260801000001_schema.sql').replace('create extension if not exists pg_net;', ''));
await db.exec(read('20260801000002_note_options.sql'));

// --- Tiny test harness --------------------------------------------------------------------
let passed = 0;
let failed = 0;
const ok = (name) => { passed++; console.log(`  ok   ${name}`); };
const bad = (name, why) => { failed++; console.log(`  FAIL ${name}: ${why}`); };

async function as(uid, sql, params = []) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? '']);
  await db.exec('set role authenticated');
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role');
  }
}
async function expectOk(name, p) {
  try { const r = await p; ok(name); return r; } catch (e) { bad(name, e.message); }
}
async function expectError(name, p, needle) {
  try { await p; bad(name, 'expected an error but it succeeded'); }
  catch (e) { e.message.includes(needle) ? ok(name) : bad(name, `wrong error: ${e.message}`); }
}
function expectEqual(name, got, want) {
  JSON.stringify(got) === JSON.stringify(want) ? ok(name) : bad(name, `got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
}

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const C = '00000000-0000-0000-0000-00000000000c';
for (const id of [A, B, C]) await db.query('insert into auth.users (id) values ($1)', [id]);

const note = { templateId: 'like', option: 'the bassline is unreal.', mood: 'hype', bpm: 124 };
const send = (uid, to, over = {}) => as(uid,
  `select public.send_song($1, $2, $3, $4, $5, $6, $7::jsonb) as id`,
  [to, over.title ?? 'Song', over.artist ?? 'Artist', over.url ?? 'https://open.spotify.com/track/abc',
   over.service ?? 'spotify', over.art ?? null, JSON.stringify(over.note ?? note)]);

console.log('Profiles');
await expectOk('create profile A', as(A, `insert into public.profiles (id, username, display_name) values ($1,'alice','Alice')`, [A]));
await expectOk('create profile B', as(B, `insert into public.profiles (id, username, display_name, timezone) values ($1,'bob','Bob','America/Indiana/Indianapolis')`, [B]));
await expectOk('create profile C', as(C, `insert into public.profiles (id, username, display_name) values ($1,'cara','Cara')`, [C]));
await expectError('username must be lowercase/valid', as(C, `update public.profiles set username='Bad Name' where id=$1`, [C]), 'violates check');
await expectError('duplicate username rejected', as(C, `update public.profiles set username='alice' where id=$1`, [C]), 'duplicate key');
await expectError('cannot create profile for someone else', as(A, `insert into public.profiles (id, username, display_name) values ($1,'sneaky','S')`, [B]), 'row-level security');
await expectError('invalid timezone rejected', as(A, `update public.profiles set timezone='Mars/Olympus' where id=$1`, [A]), 'invalid_timezone');
expectEqual('strangers cannot see each other', (await as(A, 'select username from public.profiles order by 1')).rows, [{ username: 'alice' }]);

console.log('Friends');
await expectError('cannot friend yourself', as(A, `select public.request_friend('alice')`), 'cannot_friend_self');
await expectError('unknown username', as(A, `select public.request_friend('nobody')`), 'user_not_found');
const fr = await expectOk('A requests B', as(A, `select public.request_friend('Bob') as id`));
await expectError('duplicate request', as(A, `select public.request_friend('bob')`), 'already_requested');
expectEqual('B sees A after request', (await as(B, 'select username from public.profiles order by 1')).rows, [{ username: 'alice' }, { username: 'bob' }]);
await expectError('requester cannot accept own request', as(A, `select public.respond_friend($1, true)`, [fr.rows[0].id]), 'request_not_found');
await expectError('cannot send before accepted', send(A, B), 'not_friends');
await expectOk('B accepts', as(B, `select public.respond_friend($1, true)`, [fr.rows[0].id]));
await expectError('already friends', as(B, `select public.request_friend('alice')`), 'already_friends');
await expectError('clients cannot edit friendships directly', as(A, `update public.friendships set status='accepted'`), 'permission denied');

console.log('Sending');
await db.query(`insert into public.push_tokens (user_id, token) values ($1, 'ExponentPushToken[bob]')`, [B]);
await expectError('cannot send to a non-friend', send(A, C), 'not_friends');
await expectError('rejects non-music link', send(A, B, { url: 'https://evil.example.com/x' }), 'invalid_link');
await expectError('rejects lookalike host', send(A, B, { url: 'https://spotify.com.evil.com/x' }), 'invalid_link');
await expectError('rejects userinfo trick', send(A, B, { url: 'https://open.spotify.com@evil.com/x' }), 'invalid_link');
await expectError('rejects link/service mismatch', send(A, B, { service: 'youtube' }), 'invalid_link');
await expectError('rejects free text option', send(A, B, { note: { templateId: 'like', option: 'you smell' } }), 'invalid_note');
await expectError('rejects unknown note key', send(A, B, { note: { ...note, message: 'hi' } }), 'invalid_note');
await expectError('rejects bad mood', send(A, B, { note: { ...note, mood: 'angry' } }), 'invalid_note');
await expectError('rejects bad bpm', send(A, B, { note: { ...note, bpm: 9000 } }), 'invalid_note');
await expectError('rejects non-https artwork', send(A, B, { art: 'javascript:alert(1)' }), 'violates check');
const d1 = await expectOk('A sends a valid song', send(A, B, { title: 'Blinding Lights', art: 'https://i.scdn.co/x.jpg' }));
await expectError('second song same day blocked', send(A, B), 'already_sent_today');
await expectError('cannot insert deliveries directly', as(A, `insert into public.deliveries (from_id,to_id,song_title,song_artist,song_url,song_service,note,sent_day) values ($1,$2,'x','y','https://open.spotify.com/a','spotify','{}','2020-01-01')`, [A, B]), 'permission denied');
const push1 = (await db.query(`select body from public._push_log`)).rows;
expectEqual('B was pushed "sent you a song"', push1.length === 1 && push1[0].body[0].title, 'Alice sent you a song');

console.log('Privacy');
expectEqual('stranger C sees no deliveries', (await as(C, 'select id from public.deliveries')).rows, []);
expectEqual('B sees the delivery', (await as(B, 'select id from public.deliveries')).rows.length, 1);
await expectError('push tokens are not readable', as(B, 'select * from public.push_tokens'), 'permission denied');
await expectError('sender cannot rate', as(A, `select public.rate_delivery($1,'love',0,null)`, [d1.rows[0].id]), 'delivery_not_found');
await expectError('stranger cannot rate', as(C, `select public.rate_delivery($1,'love',0,null)`, [d1.rows[0].id]), 'delivery_not_found');
await expectError('direct update of delivery blocked', as(B, `update public.deliveries set score = 10`), 'permission denied');

console.log('Rating');
await db.query(`insert into public.push_tokens (user_id, token) values ($1, 'ExponentPushToken[alice]')`, [A]);
await expectError('invalid bucket', as(B, `select public.rate_delivery($1,'amazing',0,null)`, [d1.rows[0].id]), 'invalid_bucket');
await expectError('invalid reaction', as(B, `select public.rate_delivery($1,'love',0,'free text')`, [d1.rows[0].id]), 'invalid_reaction');
const r1 = await expectOk('B rates love', as(B, `select public.rate_delivery($1,'love',0,'🔥') as s`, [d1.rows[0].id]));
expectEqual('first love song scores 8.4', Number(r1.rows[0].s), 8.4);
await expectError('cannot rate twice', as(B, `select public.rate_delivery($1,'love',0,null)`, [d1.rows[0].id]), 'already_rated');
const push2 = (await db.query(`select body from public._push_log`)).rows;
expectEqual('A was pushed "rated your song"', push2.length === 2 && push2[1].body[0].title, 'Bob rated your song');
const seen = (await as(A, 'select bucket, score, reaction from public.deliveries')).rows[0];
expectEqual('A sees verdict', [seen.bucket, Number(seen.score), seen.reaction], ['love', 8.4, '🔥']);
await expectOk('A marks it seen', as(A, `select public.mark_seen($1)`, [d1.rows[0].id]));
expectEqual('seen is recorded', (await as(A, 'select sender_seen_at is not null as s from public.deliveries')).rows[0].s, true);

console.log('Ranking inserts');
const fr2 = (await as(C, `select public.request_friend('bob') as id`)).rows[0].id;
await as(B, `select public.respond_friend($1, true)`, [fr2]);
const d2 = (await send(C, B)).rows[0].id;
const r2 = await as(B, `select public.rate_delivery($1,'love',0,null) as s`, [d2]);
expectEqual('newly best love song scores 9.2 of 2', Number(r2.rows[0].s), 9.2);
expectEqual('older song shifted down', (await as(B, `select delivery_id, position from public.rankings order by position`)).rows.map((r) => r.position), [0, 1]);
expectEqual('bad index is clamped to the end', (await as(B, `select position from public.rankings where delivery_id=$1`, [d1.rows[0].id])).rows[0].position, 1);
expectEqual('rankings are private', (await as(A, 'select * from public.rankings')).rows, []);

console.log('Next day');
await db.query(`update public.deliveries set sent_day = sent_day - 1 where from_id = $1`, [A]);
await expectOk('A can send again the next day', send(A, B, { title: 'Another' }));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
