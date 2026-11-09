# Selectas

A music based social media competition with friends.

Send one song a day to one friend, with a message built only from fixed options. They rate it
Beli-style, and you collect approvals and streaks.

## Run it

Needs Node 20+. First do the one-time backend setup in [SETUP.md](SETUP.md), then:

```bash
npm install
npx expo start    # press i for iOS simulator, a for Android, w for web, or scan the QR in Expo Go
```

`npm run typecheck` runs TypeScript. `npm run test:db` runs the database rule tests.

## How it works

- **Backend:** Supabase (Postgres, email sign-in, realtime). The schema is in `supabase/migrations`.
  Clients can only read their own data. Every write goes through a database function, so a modified app
  cannot break the rules.
- **One song a day:** a unique index on (sender, local day). The day is computed on the server from the
  sender's timezone.
- **Friends only:** songs can only go to accepted friends. Add friends by username (Friends tab).
- **No free text in messages:** `src/lib/noteOptions.json` is the single list of allowed openers, endings,
  moods, best-for and found-via options. A generated SQL table mirrors it and the database rejects anything
  else. Song links are checked against each service's domain on the server too.
- **Beli-style rating:** `src/lib/rating.ts` finds the song's place in the rater's ranking with a binary
  search ("new one or old one?"). The database stores the ranking and computes the score.
- **Approved** means the friend picked Obsessed. Streaks count approved sends in a row.
- **Live reactions and push:** realtime updates the app instantly. Database triggers send Expo push
  notifications when you receive a song or a friend rates yours (`src/lib/push.ts`).
- **Whimsy:** `src/lib/whimsy.ts` has verdicts from "Certified Banger" down to "Crimes Against Ears", with
  confetti for wins and falling trash for flops.

## Known gaps before a public launch

1. Email confirmation is off for development. Turn it on and set up a real email sender.
2. Message options are fully validated on the server. Free-text fields remain only for song title, artist,
   display name and username (length limited). Consider moderation for names.
3. Friend requests have no rate limit or block list yet.
4. The app loads all of a user's deliveries at once. Add paging when volumes grow.
5. App Store release needs an EAS build, an Apple push key and a privacy policy.
6. Replace the placeholder bundle identifiers (`com.example.selectas` in `app.json`) with your own before an App Store release.
