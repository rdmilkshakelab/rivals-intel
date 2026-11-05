import { useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { approveDevice } from "@/services/auth";

export default function ScanDeviceScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("Point your camera at the QR code displayed on your TV.");
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);

  function handleScan(data: string) {
    if (scanned) return;
    try {
      const parsed = new URL(data);
      const found = parsed.searchParams.get("code");
      if (!found) throw new Error("This QR code is not a Rivals Intel device sign-in code.");
      setCode(found.toUpperCase());
      setScanned(true);
      setMessage("Device code found. Check the code below, then approve the sign-in.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That QR code could not be read.");
      setScanned(true);
    }
  }
  async function approve() {
    setBusy(true);
    try {
      const result = await approveDevice(code);
      setMessage("Approved " + result.deviceName + ". Your TV should now be signed in.");
      setCode("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not approve this device.");
    } finally { setBusy(false); }
  }

  if (!permission) return <SafeAreaView style={styles.safe}><Text style={styles.copy}>Checking camera permission...</Text></SafeAreaView>;
  if (!permission.granted) {
    return <SafeAreaView style={styles.safe}><View style={styles.content}><Text style={styles.title}>Camera access needed</Text><Text style={styles.copy}>Rivals Intel uses your camera only to scan a TV sign-in QR code.</Text><Pressable style={styles.button} onPress={requestPermission}><Text style={styles.buttonText}>ALLOW CAMERA</Text></Pressable></View></SafeAreaView>;
  }
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ BACK</Text></Pressable>
        <Text style={styles.eyebrow}>DEVICE PAIRING</Text>
        <Text style={styles.title}>Scan your TV.</Text>
        {!scanned ? <View style={styles.cameraFrame}><CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={({ data }) => handleScan(data)}/></View> : null}
        {code ? <View style={styles.card}><Text style={styles.copy}>Sign-in code</Text><Text style={styles.code}>{code}</Text><Pressable disabled={busy} onPress={approve} style={styles.button}><Text style={styles.buttonText}>{busy ? "APPROVING..." : "APPROVE THIS DEVICE"}</Text></Pressable></View> : null}
        <Text style={styles.copy}>{message}</Text>
        {scanned ? <Pressable onPress={() => { setScanned(false); setCode(""); setMessage("Point your camera at the QR code displayed on your TV."); }}><Text style={styles.retry}>SCAN AGAIN</Text></Pressable> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#090B12" },
  content: { padding: 20, gap: 16, maxWidth: 640, width: "100%", alignSelf: "center" },
  back: { color: "#9B6BFF", fontSize: 11, fontWeight: "900" },
  eyebrow: { color: "#9B6BFF", fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  title: { color: "#F5F5FA", fontSize: 28, fontWeight: "900" },
  copy: { color: "#9298AA", fontSize: 13, lineHeight: 20, textAlign: "center" },
  cameraFrame: { height: 330, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#4A3A68" },
  camera: { flex: 1 },
  card: { backgroundColor: "#141722", borderWidth: 1, borderColor: "#292E3E", borderRadius: 16, padding: 18, gap: 14, alignItems: "center" },
  code: { color: "#FFFFFF", fontSize: 30, fontWeight: "900", letterSpacing: 4 },
  button: { backgroundColor: "#9B6BFF", borderRadius: 10, padding: 14, alignItems: "center", width: "100%" },
  buttonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  retry: { color: "#C5A7FF", fontSize: 11, fontWeight: "900", textAlign: "center" }
});
