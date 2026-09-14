# Common Ground volunteer training

A static volunteer-training course app with Supabase-backed authentication, organisations, invites, roles, learner progress and assessment history. The app is designed to stay lightweight for the Supabase free plan: no realtime subscriptions, no storage bucket usage, no polling, and only small row-per-user/course progress records.

## Run locally

```bash
npm start
```

The app serves `dist` at http://127.0.0.1:4173 using Python 3. Keep the process running while testing.

```bash
npm run check
npm test
```

`npm run check` validates JavaScript syntax. `npm test` runs the state, scoring, course-content and persistence tests with Node.js. There is no build step; `dist` is the deployable static site.

## Deploy with Netlify

Use the repository root as the site directory. Because this is a static app with no build step, Netlify can serve the checked-in `dist` folder directly. If Netlify asks for settings, use:

- Build command: leave blank
- Publish directory: `dist`

## Included

- Public signed-out landing page with sign-in/sign-up card.
- Supabase Auth email/password login, signup and forgot-password flow.
- Organisation account creation, admin/user roles and invite-only learner access.
- Admin area for inviting one learner email at a time and viewing member/invite status.
- Core and advanced course sections with module cards, progress tracking and certificate eligibility.
- Sequential theory sections that unlock only after “Mark as read and continue”.
- Test-ready screen before final assessment.
- One-question-at-a-time timed assessments.
- Test history for all submitted attempts.
- Retake rules: one extra attempt after a failed test; after two failures, theory resets before the test unlocks again.
- Static Supabase SQL migration and `invite-member` Edge Function source.

## Supabase

The browser app uses the public Supabase project URL and publishable key in `dist/supabase-config.js`. Secret keys must only be configured in Supabase Edge Function secrets and must never be placed in browser code.

Database schema and RLS policy source is in `supabase/migrations/20260914000000_org_auth_training.sql`.

The invite function source is in `supabase/functions/invite-member/index.ts`.
