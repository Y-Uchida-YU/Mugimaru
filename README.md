# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Social login setup (LINE / X)

Set env values in `.env`:

```bash
EXPO_PUBLIC_LINE_CHANNEL_ID=...
EXPO_PUBLIC_X_CLIENT_ID=...
EXPO_PUBLIC_OAUTH_REDIRECT_URI=https://your-app.vercel.app/auth/callback
EXPO_PUBLIC_APP_SCHEME=mugimaru
```

For local PoC only, you can also set:

```bash
EXPO_PUBLIC_LINE_CHANNEL_SECRET=...
EXPO_PUBLIC_X_CLIENT_SECRET=...
```

## Events API setup (Eventbrite)

To fetch dog-related events in the `Events` tab, set:

```bash
EXPO_PUBLIC_EVENTBRITE_TOKEN=...
```

Without this token, the app falls back to sample events for UI testing.

Register this callback URI in each provider console:

```text
https://your-app.vercel.app/auth/callback
```

If `EXPO_PUBLIC_OAUTH_REDIRECT_URI` is not set, the app falls back to `mugimaru://auth/callback`.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
