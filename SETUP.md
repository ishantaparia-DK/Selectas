# Backend setup (about 15 minutes)

Tastemaker uses [Supabase](https://supabase.com) (Postgres, sign-in and realtime) and Expo's push service.
Everything below uses free tiers.

## 1. Create the Supabase project

1. Sign in at supabase.com and create a new project. Pick a region near your users and save the database
   password somewhere safe (you will not need it in the app).
2. Open **SQL Editor**, paste the contents of
   `supabase/migrations/20260801000001_schema.sql`, and click **Run**.
3. Do the same with `supabase/migrations/20260801000002_note_options.sql`.

If step 2 complains about `pg_net`, open **Database > Extensions**, enable `pg_net`, and run it again.

## 2. Turn off email confirmation (development only)

**Authentication > Providers > Email**: switch off **Confirm email**. Otherwise every sign-up waits for an
email, and Supabase's built-in email sender is limited to a few messages an hour. Turn it back on and connect
a real email sender before a public launch.

## 3. Add the keys to the app

1. **Project Settings > API**: copy the **Project URL** and the **anon public** key.
2. In the project folder (next to `package.json`), create a file named `.env` with these two lines, using your
   own values:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
   ```

3. Restart Expo with `npx expo start --clear`.

`.env` is already in `.gitignore`, so it will not be committed.

The anon key is meant to be public. The database rules decide what each person can see and do. Never put the
`service_role` key in the app or in `.env`.

## 4. Push notifications

Push needs your Expo project linked once:

```bash
npx eas-cli login
npx eas-cli init
```

`eas init` writes a project id into `app.json`. Restart Expo, open the app on your iPhone, and allow
notifications when asked.

Notes:

- Push works on real phones only, not simulators or the web.
- In Expo Go, push works on iOS. Android needs a development build (Expo removed it from Expo Go).
- For the App Store you will build with EAS and add an Apple push key. That is a separate step.

## 5. Try it with two accounts

1. Sign up on your phone and pick a username.
2. Open the web version (press `w` in the Expo terminal) in a private window, sign up with a second email, and
   pick another username.
3. On one account, **Friends > Add a friend** with the other username. Accept on the other.
4. Send a song, rate it from the other account, and watch the reaction pop up.

## Changing the message options

Edit `src/lib/noteOptions.json`, then regenerate and re-run the SQL:

```bash
node scripts/gen-note-options.mjs
```

Paste the new `20260801000002_note_options.sql` into the SQL Editor and run it. The app and the database must
match, because the database rejects any message that is not on the list.

## Running the database tests

```bash
node supabase/tests/db.test.mjs
```

This runs every rule (one song a day, friends only, link and message checks, privacy, rating) against an
in-memory Postgres. It uses stand-ins for Supabase's auth and push pieces, so it does not replace trying the
real project.
