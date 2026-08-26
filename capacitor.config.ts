import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Keel is a server-rendered Next.js app (auth, server actions, live DB), so it
 * can't be statically exported into the bundle. Instead the native shell loads
 * the deployed app in a WebView. Requires connectivity — there is no offline
 * bundle beyond the `native/` fallback page.
 */
const config: CapacitorConfig = {
  appId: "app.keel.coparent",
  appName: "Keel",
  webDir: "native",
  server: {
    url: "https://keel-phi-nine.vercel.app",
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#22282B",
      showSpinner: false,
    },
  },
};

export default config;
