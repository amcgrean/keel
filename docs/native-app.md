# Keel native app (Capacitor)

Keel is server-rendered, so the native app is a thin **Capacitor shell that loads
the deployed site** (`https://keel-phi-nine.vercel.app`) in a native WebView.
All app logic stays on the web app we already ship. If you change the production
URL, update `server.url` in `capacitor.config.ts`.

The JS scaffolding (config, plugins) is done. The remaining steps add the native
platform projects and build them — and **iOS can only be built on macOS**.

## Android (buildable on Windows)

1. Install **Android Studio** (includes the Android SDK + an emulator).
2. From the repo root:
   ```
   npx cap add android
   npx cap sync android
   npx cap open android
   ```
3. In Android Studio, Run on an emulator or a USB device. To ship, build a
   signed AAB/APK (Build → Generate Signed Bundle).

## iOS (requires a Mac + Xcode)

On a Mac with Xcode and CocoaPods installed, clone the repo and:
```
npm install
npx cap add ios
npx cap sync ios
npx cap open ios
```
Then in Xcode: set your Team (Apple Developer account), pick a device/simulator,
and Run. Distribute via TestFlight/App Store from Xcode → Product → Archive.

### No Mac? Cloud build options
- **Codemagic** or **Ionic Appflow** — connect this GitHub repo, they build the
  iOS app on hosted macOS and can push to TestFlight. Needs an Apple Developer
  account ($99/yr) for signing.
- **GitHub Actions** with a `macos-latest` runner running the `npx cap add ios`
  + `xcodebuild` steps.

## After the first `cap add`
Commit the generated `ios/` and/or `android/` folders (build artifacts are
gitignored). On later web changes you usually **don't** need to rebuild the
native app — it loads the live URL — unless you change native config/plugins,
then `npx cap sync`.

## Native push (later)
Web push works in the installed PWA but not inside the iOS WebView. For native
notifications, add `@capacitor/push-notifications`, register for APNs/FCM, store
the native token, and send via APNs/FCM instead of (or alongside) web-push.
This needs an Apple Developer account and some server changes — deferred.
