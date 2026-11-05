import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { createDeviceAuthorisation, pollDeviceAuthorisation } from "@/services/auth";

export default function DeviceLoginScreen() {
  const router = useRouter();
  const [pairing, setPairing] = useState<{ deviceCode: string; userCode: string; verificationUri: string; qrCodeDataUrl: string; expiresIn: number; interval: number } | null>(null);
  const [status, setStatus] = useState("Preparing a secure sign-in code...");
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function begin() {
      try {
        const result = await createDeviceAuthorisation("Rivals Intel TV");
        if (cancelled) return;
        setPairing(result);
        setStatus("Scan the QR code or visit the activation page and enter this code.");
        const deadline = Date.now() + result.expiresIn * 1000;
        const poll = async () => {
          if (cancelled) return;
          if (Date.now() >= deadline) { setStatus("This code expired. Start again to get a new one."); return; }
          try {
            const result = await pollDeviceAuthorisation(result.deviceCode);
            if (cancelled) return;
            if (result.status === "complete") { setStatus("This device is now linked to your Rivals Intel account."); return; }
          } catch (problem) {
            if (!cancelled) setError(problem instanceof Error ? problem.message : "Pairing failed.");
            return;
          }
          timer = setTimeout(poll, result.interval * 1000);
        };
        timer = setTimeout(poll, result.interval * 1000);
      } catch (problem) {
        if (!cancelled) setError(problem instanceof Error ? problem.message : "Could not start device pairing.");
      }
    }
    begin();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, []);
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ BACK</Text></Pressable>
        <Text style={styles.eyebrow}>RIVALS INTEL TV</Text>
        <Text style={styles.title}>Sign in on this device.</Text>
        <Text style={styles.copy}>Use your phone camera or visit the activation page on a computer. Your password is never entered on the TV.</Text>
        {pairing ? <View style={styles.card}>
          <Image source={{ uri: pairing.qrCodeDataUrl }} style={styles.qr}/>
          <Text style={styles.copy}>Or visit</Text>
          <Text selectable style={styles.link}>{pairing.verificationUri.split("?")[0]}</Text>
          <Text style={styles.code}>{pairing.userCode}</Text>
          <Text style={styles.small}>Code expires in 10 minutes.</Text>
        </View> : null}
        <Text style={styles.status}>{error || status}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#090B12" },
  content: { padding: 22, gap: 16, alignItems: "center", maxWidth: 760, width: "100%", alignSelf: "center" },
  back: { color: "#9B6BFF", fontSize: 11, fontWeight: "900", alignSelf: "flex-start", width: "100%" },
  eyebrow: { color: "#9B6BFF", fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  title: { color: "#F5F5FA", fontSize: 28, fontWeight: "900", textAlign: "center" },
  copy: { color: "#9298AA", fontSize: 13, lineHeight: 20, textAlign: "center" },
  card: { backgroundColor: "#141722", borderWidth: 1, borderColor: "#292E3E", borderRadius: 18, padding: 20, alignItems: "center", gap: 12, width: "100%" },
  qr: { width: 240, height: 240, backgroundColor: "#FFFFFF", borderRadius: 8 },
  link: { color: "#C5A7FF", fontSize: 13, fontWeight: "800" },
  code: { color: "#FFFFFF", fontSize: 34, fontWeight: "900", letterSpacing: 4 },
  small: { color: "#9298AA", fontSize: 10 },
  status: { color: "#C5A7FF", fontSize: 12, textAlign: "center" }
});
