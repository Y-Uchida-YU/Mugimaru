# Mugimaru (iOS local build + Supabase)

Mugimaru is a React Native app with:

- Social signup/login (LINE / Google / Apple / X / Email / Guest)
- Board tab with post + reply + profile features
- Map tab with spots + reviews
- Supabase-backed data persistence

## Setup

1. Install Xcode, Node.js 22 LTS or later, and CocoaPods. Then install project
   dependencies:

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

3. Start the iOS app locally:

```bash
npm run ios
```

`npm run ios` compiles the generated native app on this Mac; it does not use an
EAS Build credit. Open `ios/Mugimaru.xcworkspace` in Xcode whenever you need to
select a physical device, configure signing, inspect native logs, archive, or
upload a release.

## iOS development and release

The `ios/` directory is checked into Git and is the source of truth for native
iOS settings. Expo remains only as an SDK and router layer; EAS Build and EAS
Update are not used.

- `npm run ios` — build and run locally on a Simulator or connected device.
- `npm run ios:pods` — install CocoaPods after changing JavaScript native
  dependencies.
- `npm run ios:clean` — regenerate `ios/` from `app.json`, then install Pods.
  Run it after an Expo SDK upgrade or a change to native app configuration.

### TestFlight release

1. Open `ios/Mugimaru.xcworkspace` in Xcode.
2. In **Signing & Capabilities**, select the Apple Developer team for
   `com.yutauchida.mugimaru`. Confirm that **Sign in with Apple** is enabled.
3. Set the release version and build number in the Mugimaru target.
4. Select **Any iOS Device (arm64)**, then use **Product → Archive**.
5. Validate and distribute the archive to App Store Connect from Xcode's
   Organizer. TestFlight processing happens in App Store Connect.

This workflow has no Expo build quota. The remaining publishing cost is the
Apple Developer Program membership required for TestFlight and App Store
distribution.

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
