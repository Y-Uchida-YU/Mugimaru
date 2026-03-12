# Mugimaru (Expo + Supabase)

Mugimaru is an Expo app with:

- Social signup/login (LINE / Google / Apple / X / Email / Guest)
- Board tab with post + reply + profile features
- Map tab with spots + reviews
- Supabase-backed data persistence

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_LINE_CHANNEL_ID=...
EXPO_PUBLIC_GOOGLE_CLIENT_ID=...
EXPO_PUBLIC_APPLE_CLIENT_ID=...
EXPO_PUBLIC_X_CLIENT_ID=...
EXPO_PUBLIC_OAUTH_REDIRECT_URI=...
EXPO_PUBLIC_APP_SCHEME=mugimaru
```

3. Start app:

```bash
npx expo start
```

## Board SNS Upgrade

The board now includes:

- Post creation with photo upload
- Thread comments + reply
- Profile modal + follow
- Post likes
- Post stamps/reactions
- Community chat modal with sticker sending

UI is refreshed to a Lemon-style layout focused on mobile readability.

## Settings Upgrade

Settings tab now has 3 sections:

- `Personal`: account email + app preferences (push/digest/map hints/language)
- `Board Profile`: display name, avatar, bio, dog profile
- `Theme / Color`: 20 curated palettes users can switch instantly

Theme selection is persisted locally and reflected in tab/navigation colors.

## Supabase Schema / Migration

### Fresh setup

Apply:

- `supabase/schema.sql`
- `supabase/migrations/20260310_board_social_upgrade.sql`

### Existing setup (non-destructive)

Apply:

- `supabase/migrations/20260310_board_social_upgrade.sql`

This migration adds:

- `public.board_post_likes`
- `public.board_post_stamps`
- `public.board_chat_messages`

plus indexes, RLS policies, and grants.

## TestFlight / EAS

- Workflow: `.github/workflows/ios-testflight.yml`
- Trigger: push to `main`
- Build profile: `production` (in `eas.json`)

Required GitHub secrets:

- `EXPO_TOKEN`
- `ASC_API_KEY_ID`
- `ASC_API_ISSUER_ID`
- `ASC_API_KEY_P8`
- `ASC_APP_ID`
