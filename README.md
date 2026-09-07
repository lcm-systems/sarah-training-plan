# Sarah's Training Plan

Live: **https://lcm-systems.github.io/sarah-training-plan/**
Sign in: `sarah@training.app` / `SarahLifts2026!`

An offline-first web app: the workout rotation, form videos, set tracking, rest
timers and progress charts. Every tap saves on the phone first, so a dead signal in
the gym changes nothing, and finished workouts back up to Supabase so a lost phone
costs nothing.

## How it is put together

| Piece | Where |
|---|---|
| App (620 KB) | GitHub Pages, repo `lcm-systems/sarah-training-plan` |
| Database and login | Supabase project `lgukelcpgcgdceqrvrud` |
| Demo videos (45 clips) | Supabase Storage, **private** bucket `clips`, fetched with short-lived signed links |
| Working copy | the phone's own storage, synced in the background |

The clips are re-encoded from other people's YouTube uploads, so they are deliberately
not on the public site. Only a signed-in user can fetch them.

## Working on it

Source lives in this folder. `video/` and `poster/` are local only and never deployed.

```bash
./make_deploy.sh                       # builds ../deploy (app only, clips point at Supabase)
cd ../deploy && git add -A && git commit -m "..." && git push    # publishes
node supabase/setup.mjs sarah@training.app 'SarahLifts2026!'     # re-uploads clips if they change
```

The programme itself (exercises, cues, sets, reps) is `js/data.js`, generated from
`epub/data.json` in the working folder. Change it there and regenerate.

`supabase/schema.sql` is the whole database and has already been run. It is safe to
run again; it recreates the tables, the row-level security and the two buckets.

## Notes

- Sign-ups are switched off in the project. Accounts are created from the Supabase
  dashboard (Authentication → Users → Add user), which is why the app only offers sign-in.
- Row-level security means each account can only ever read and write its own rows.
  This was tested with a second account, which saw nothing.
- On her phone: open the address in Safari, then Share → **Add to Home Screen**.
  Then **You → Save videos on this phone** stores every clip for the gym.
