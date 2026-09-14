# Supabase setup

This project is prepared for Supabase project `hffrrrabpqdbssuxeylc`.

## 1. Apply the database migration

Run `supabase/migrations/20260914000000_org_auth_training.sql` in the Supabase SQL editor, or apply it with the Supabase CLI if you install/link the CLI later.

The migration creates RLS-protected tables for profiles, organisations, memberships, invites, course progress and append-only test records. It also creates triggers that:

- create a profile when a Supabase Auth user is created
- make the creator of an organisation its first `admin`
- accept pending invites automatically when a matching invited email signs up

## 2. Deploy the Edge Function

Deploy `supabase/functions/invite-member/index.ts` as `invite-member`.

The function reads Supabase's default Edge Function secrets: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`, and `SUPABASE_SECRET_KEYS`. If using legacy keys instead, it can also read `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.

The secret key is used only by this Edge Function. Do not put it in browser code.

## 3. Enable the frontend client

Put the project publishable/anon key in `dist/supabase-config.js`:

```js
export const SUPABASE_URL='https://hffrrrabpqdbssuxeylc.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY='your-publishable-anon-key';
```

With the key blank, the app stays in local demo mode and uses browser localStorage.

## 4. Configure Auth URLs

In Supabase Auth settings, allow these URLs while developing:

- `http://127.0.0.1:4173`
- `http://127.0.0.1:4173/#library`
- `http://127.0.0.1:4173/#invite`
- `http://127.0.0.1:4173/#reset-password`

Add the production domain equivalents when the site is deployed.
