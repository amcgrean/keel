# Keel native app (Expo + EAS)

Keel is server-rendered, so the native app is a thin **Expo WebView shell** that
loads the deployed site (`https://keel-phi-nine.vercel.app`). All app logic stays
on the web app. If the production URL changes, update `KEEL_URL` in
`mobile/App.js`. The project lives in `mobile/` and builds with **EAS** — Expo's
cloud build service, so **iOS builds run on Expo's macOS servers (no Mac needed
on your Windows machine)**.

## One-time setup
```
cd mobile
npm install
npm install -g eas-cli        # or use `npx eas-cli@latest` in place of `eas`
eas login                     # your Expo account
```
If npm complains about versions: `npx expo install --fix`.

Quick local sanity check (optional, needs the Expo Go app on your phone):
```
npx expo start                # scan the QR with Expo Go
```

## iOS (via EAS cloud — works from Windows)
Requires an **Apple Developer account** ($99/yr) to install on real iPhones.

Register your two iPhones for a direct-install (ad-hoc) build:
```
eas device:create             # follow the link on each phone to register it
eas build --platform ios --profile preview
```
EAS will offer to create the signing credentials for you (log in with your Apple
account when prompted). When the build finishes it gives a QR/link — open it on a
registered iPhone to install.

Prefer TestFlight instead of ad-hoc?
```
eas build --platform ios --profile production
eas submit --platform ios --latest
```

## Android (also cloud, or local)
```
eas build --platform android --profile preview
```
Gives an installable **.apk** link — open it on the phone and install. No
developer account needed for a direct APK.

## Updating
Because the app loads the live URL, **web changes need no rebuild** — they show
up on next launch. Rebuild the native app only when you change `mobile/`
(the shell, icons, native config, or add native plugins).

## Native push (later)
Web push works in the installed PWA but not inside a WebView. For native
notifications, add `expo-notifications`, register for a push token, store it, and
send via Expo's push service — a follow-up once the shell is in the stores.
