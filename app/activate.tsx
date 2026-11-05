import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { approveDevice, getAccount } from "@/services/auth";

export default function ActivateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(String(params.code || ""));
  const [message, setMessage] = useState("Sign in first, then approve the code shown on your TV or other device.");
  const [busy, setBusy] = useState(false);
  async function approve() {
    setBusy(true);
    try {
      await getAccount();
      const result = await approveDevice(code.trim().toUpperCase());
      setMessage("Approved " + result.deviceName + ". You can return to your device now.");
      setCode("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not approve this device."); }
    finally { setBusy(false); }
  }
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ BACK</Text></Pressable>
        <Text style={styles.eyebrow}>RIVALS INTEL DEVICE PAIRING</Text>
        <Text style={styles.title}>Link a device.</Text>
        <Text style={styles.copy}>Enter the short code displayed on your TV or browser. Only approve codes on devices you control.</Text>
        <View style={styles.card}>
          <TextInput value={code} onChangeText={setCode} placeholder="XXXX-XXXX" placeholderTextColor="#9298AA" autoCapitalize="characters" autoCorrect={false} maxLength={9} style={styles.input}/>
          <Pressable disabled={busy || code.replace(/-/g, "").length !== 8} onPress={approve} style={styles.button}><Text style={styles.buttonText}>{busy ? "CHECKING..." : "APPROVE DEVICE"}</Text></Pressable>
        </View>
        <Text style={styles.copy}>{message}</Text>
        <Pressable onPress={() => router.push("/account")} style={styles.button}><Text style={styles.buttonText}>GO TO ACCOUNT SIGN IN</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#090B12" },
  content: { padding: 22, gap: 16, maxWidth: 620, width: "100%", alignSelf: "center" },
  back: { color: "#9B6BFF", fontSize: 11, fontWeight: "900", marginBottom: 12 },
  eyebrow: { color: "#9B6BFF", fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  title: { color: "#F5F5FA", fontSize: 30, fontWeight: "900" },
  copy: { color: "#9298AA", fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: "#141722", borderWidth: 1, borderColor: "#292E3E", borderRadius: 16, padding: 16, gap: 12 },
  input: { backgroundColor: "#090B12", color: "#F5F5FA", borderWidth: 1, borderColor: "#373D51", borderRadius: 10, padding: 16, fontSize: 22, fontWeight: "900", letterSpacing: 3, textAlign: "center" },
  button: { backgroundColor: "#9B6BFF", borderRadius: 10, padding: 14, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", letterSpacing: 1 }
});
