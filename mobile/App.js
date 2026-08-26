import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { BackHandler, Platform, SafeAreaView, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

// The native app is a thin shell over the live, server-rendered Keel.
const KEEL_URL = "https://keel-phi-nine.vercel.app";

export default function App() {
  const webRef = useRef(null);
  const canGoBack = useRef(false);

  // Android hardware back navigates WebView history instead of closing the app.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack.current && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <WebView
        ref={webRef}
        source={{ uri: KEEL_URL }}
        style={styles.web}
        originWhitelist={["*"]}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        onNavigationStateChange={(s) => {
          canGoBack.current = s.canGoBack;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F0E8" },
  web: { flex: 1, backgroundColor: "#F3F0E8" },
});
