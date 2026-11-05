import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { beginAuthenticatorSetup, confirmAuthenticator, disableAuthenticator, getAccount, getDevices, loginAccount, logoutAccount, registerAccount, revokeDevice, signOutOtherDevices, type AccountUser, type DeviceSession } from "@/services/auth";

const bg = "#090B12";
const panel = "#141722";
const border = "#292E3E";
const purple = "#9B6BFF";
const muted = "#9298AA";

function Action({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.action, secondary && styles.secondary]}><Text style={styles.actionText}>{label}</Text></Pressable>;
}

export default function AccountScreen() {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [tab, setTab] = useState<"devices" | "security">("devices");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [confirmCode, setConfirmCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    const account = await getAccount();
    setUser(account.user);
    const result = await getDevices();
    setDevices(result.devices);
  }
  useEffect(() => { refresh().catch(() => setUser(null)); }, []);

  async function run(task: () => Promise<void>) {
    setBusy(true); setMessage("");
    try { await task(); } catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  async function submitAuth() {
    await run(async () => {
      if (mode === "register") await registerAccount(email, username, password);
      else await loginAccount(email, password, { totpCode: totpCode || undefined, recoveryCode: recoveryCode || undefined });
      await refresh();
      setMessage("You're signed in.");
    });
  }

  async function setupAuthenticator() {
    await run(async () => {
      const result = await beginAuthenticatorSetup();
      setQr(result.qrCodeDataUrl);
      setSecret(result.secret);
    });
  }
  async function finishAuthenticator() {
    await run(async () => {
      const result = await confirmAuthenticator(confirmCode);
      setRecoveryCodes(result.recoveryCodes);
      setQr(""); setSecret(""); setConfirmCode("");
      await refresh();
      setMessage("Authenticator enabled. Save these recovery codes now.");
    });
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ BACK</Text></Pressable>
          <Text style={styles.eyebrow}>RIVALS INTEL ACCOUNT</Text>
          <Text style={styles.title}>{mode === "login" ? "Welcome back." : "Create your account."}</Text>
          <Text style={styles.muted}>One account for your Rivals Intel devices.</Text>
          <View style={styles.card}>
            <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={muted} autoCapitalize="none" keyboardType="email-address" style={styles.input}/>
            {mode === "register" ? <TextInput value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={muted} autoCapitalize="none" style={styles.input}/> : null}
            <TextInput value={password} onChangeText={setPassword} placeholder="Password (12+ characters)" placeholderTextColor={muted} secureTextEntry style={styles.input}/>
            {mode === "login" ? <TextInput value={totpCode} onChangeText={setTotpCode} placeholder="Authenticator code (if enabled)" placeholderTextColor={muted} keyboardType="number-pad" style={styles.input}/> : null}
            {mode === "login" ? <TextInput value={recoveryCode} onChangeText={setRecoveryCode} placeholder="Or recovery code" placeholderTextColor={muted} autoCapitalize="characters" style={styles.input}/> : null}
            <Action label={busy ? "PLEASE WAIT..." : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"} onPress={submitAuth}/>
            <Action label={mode === "login" ? "CREATE AN ACCOUNT" : "I ALREADY HAVE AN ACCOUNT"} onPress={() => setMode(mode === "login" ? "register" : "login")} secondary/>
          </View>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Text style={styles.small}>Account creation currently requires a configured Rivals Intel API and PostgreSQL database. Email verification is not yet wired to a mail provider.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ DASHBOARD</Text></Pressable>
        <Text style={styles.eyebrow}>ACCOUNT SETTINGS</Text>
        <Text style={styles.title}>Your account.</Text>
        <Text style={styles.muted}>{user.username} · {user.email}</Text>
        <View style={styles.tabs}>
          <Pressable onPress={() => setTab("devices")} style={[styles.tab, tab === "devices" && styles.tabActive]}><Text style={styles.tabText}>DEVICES</Text></Pressable>
          <Pressable onPress={() => setTab("security")} style={[styles.tab, tab === "security" && styles.tabActive]}><Text style={styles.tabText}>SECURITY</Text></Pressable>
        </View>
        {tab === "devices" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Signed-in devices</Text>
            <Text style={styles.muted}>Review sessions and remove devices you no longer use.</Text>
            {devices.map((device) => (
              <View key={device.id} style={styles.device}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deviceName}>{device.name}{device.current ? " · THIS DEVICE" : ""}</Text>
                  <Text style={styles.small}>Last active {new Date(device.last_seen_at).toLocaleString()}</Text>
                </View>
                {!device.current ? <Pressable onPress={() => run(async () => { await revokeDevice(device.id); await refresh(); })}><Text style={styles.remove}>SIGN OUT</Text></Pressable> : <Text style={styles.active}>ACTIVE</Text>}
              </View>
            ))}
            {devices.length > 1 ? <Action label="SIGN OUT OF ALL OTHER DEVICES" onPress={() => run(async () => { await signOutOtherDevices(); await refresh(); })} secondary/> : null}
            <Action label="PAIR A TV OR OTHER DEVICE" onPress={() => router.push("/activate")} secondary/>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Two-factor authentication</Text>
            <Text style={styles.muted}>Use Google Authenticator, Microsoft Authenticator or another TOTP-compatible app.</Text>
            {user.twoFactorEnabled ? <Text style={styles.active}>AUTHENTICATOR ENABLED</Text> : null}
            {!user.twoFactorEnabled && !qr ? <Action label="ADD AUTHENTICATOR APP" onPress={setupAuthenticator}/> : null}
            {qr ? <>
              <Image source={{ uri: qr }} style={styles.qr}/>
              <Text style={styles.small}>Scan this QR code in your authenticator app. Or enter this setup key manually:</Text>
              <Text selectable style={styles.secret}>{secret}</Text>
              <TextInput value={confirmCode} onChangeText={setConfirmCode} placeholder="Six-digit code" placeholderTextColor={muted} keyboardType="number-pad" style={styles.input}/>
              <Action label="VERIFY AND ENABLE" onPress={finishAuthenticator}/>
            </> : null}
            {recoveryCodes.length ? <View style={styles.recovery}><Text style={styles.cardTitle}>Save your recovery codes</Text><Text style={styles.small}>Each code works once. Store these somewhere safe. They are shown only now.</Text>{recoveryCodes.map((code) => <Text selectable key={code} style={styles.secret}>{code}</Text>)}</View> : null}
            {user.twoFactorEnabled ? <View style={styles.recovery}><Text style={styles.cardTitle}>Disable authenticator</Text><TextInput value={disablePassword} onChangeText={setDisablePassword} placeholder="Account password" placeholderTextColor={muted} secureTextEntry style={styles.input}/><TextInput value={disableCode} onChangeText={setDisableCode} placeholder="Current six-digit code" placeholderTextColor={muted} keyboardType="number-pad" style={styles.input}/><Action label="DISABLE TWO-FACTOR AUTHENTICATION" onPress={() => run(async () => { await disableAuthenticator(disablePassword, disableCode); setDisablePassword(""); setDisableCode(""); setRecoveryCodes([]); await refresh(); })} secondary/></View> : null}
          </View>
        )}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Action label={busy ? "PLEASE WAIT..." : "SIGN OUT"} onPress={() => run(async () => { await logoutAccount(); setUser(null); setDevices([]); })} secondary/>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: bg },
  content: { padding: 20, paddingBottom: 48, gap: 15, maxWidth: 760, width: "100%", alignSelf: "center" },
  back: { color: purple, fontSize: 11, fontWeight: "900", letterSpacing: 1.2, marginBottom: 12 },
  eyebrow: { color: purple, fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  title: { color: "#F5F5FA", fontSize: 30, fontWeight: "900" },
  muted: { color: muted, fontSize: 12, lineHeight: 18 },
  card: { backgroundColor: panel, borderWidth: 1, borderColor: border, borderRadius: 16, padding: 16, gap: 12 },
  cardTitle: { color: "#F5F5FA", fontSize: 17, fontWeight: "800" },
  input: { backgroundColor: "#0C0F18", color: "#F5F5FA", borderWidth: 1, borderColor: border, borderRadius: 10, padding: 13, fontSize: 14 },
  action: { backgroundColor: purple, borderRadius: 10, padding: 13, alignItems: "center", justifyContent: "center", minHeight: 44 },
  secondary: { backgroundColor: "#202436", borderWidth: 1, borderColor: "#373D51" },
  actionText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  message: { color: "#C5A7FF", fontSize: 12, lineHeight: 18 },
  small: { color: muted, fontSize: 10, lineHeight: 16 },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9, backgroundColor: panel, borderWidth: 1, borderColor: border },
  tabActive: { borderColor: purple, backgroundColor: "#241D35" },
  tabText: { color: "#F5F5FA", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  device: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: border, paddingTop: 13 },
  deviceName: { color: "#F5F5FA", fontSize: 12, fontWeight: "800" },
  remove: { color: "#FF858F", fontSize: 9, fontWeight: "900" },
  active: { color: "#65D9A0", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  qr: { width: 220, height: 220, alignSelf: "center", backgroundColor: "#FFFFFF", borderRadius: 8 },
  secret: { color: "#D5C3FF", fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  recovery: { borderTopWidth: 1, borderTopColor: border, paddingTop: 14, gap: 7 }
});
