import { useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Linking } from "react-native";
import { fetchPlayer } from "@/services/api";
import type { PlayerSummary } from "@/services/demo";
import { colors } from "@/theme/colors";
import { WebNav } from "@/components/WebNav";

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {accent ? <View style={styles.statAccent} /> : null}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [query, setQuery] = useState("");
  const [player, setPlayer] = useState<PlayerSummary>({ name: "No player selected", uid: "—", platform: "Search above", rank: "—", winRate: 0, kills: 0, deaths: 0, wins: 0, matches: 0, heroes: [] });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("Search for a public player profile to load real statistics.");

  const kd = useMemo(() => (player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toFixed(2)), [player]);

  async function searchPlayer() {
    if (!query.trim()) {
      setNotice("Enter a player name or UID to search.");
      return;
    }
    setLoading(true);
    setNotice("");
    try {
      const result = await fetchPlayer(query.trim());
      setPlayer(result);
      setNotice("Profile loaded from the configured stats service.");
    } catch {
      setNotice("Couldn't load that profile. Check the API proxy and player name. Demo data is still available.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <WebNav />
      <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide]} showsVerticalScrollIndicator={false}>
        <View style={styles.topline}>
          <View>
            <Text style={styles.eyebrow}>MARVEL RIVALS COMPANION</Text>
            <Text style={styles.brand}>RIVALS <Text style={styles.brandAccent}>INTEL</Text></Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Pressable onPress={() => router.push("/account")} style={styles.statusPill}><Text style={styles.statusText}>ACCOUNT</Text></Pressable><View style={styles.statusPill}><View style={styles.statusDot} /><Text style={styles.statusText}>BETA</Text></View></View>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={searchPlayer}
            placeholder="Player name or UID"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={styles.searchInput}
            returnKeyType="search"
          />
          <Pressable onPress={searchPlayer} style={({ pressed }) => [styles.searchButton, pressed && { opacity: 0.75 }]} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchButtonText}>SEARCH</Text>}
          </Pressable>
        </View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <Pressable onPress={() => Linking.openURL("https://rdmilkshakelab.github.io/rivals-intel/lording-the-roster/")} style={styles.challengeCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.challengeEyebrow}>CREATOR CHALLENGE</Text>
            <Text style={styles.challengeTitle}>Lording the Roster</Text>
            <Text style={styles.challengeCopy}>Track every hero from first match to Lord mastery.</Text>
          </View>
          <Text style={styles.challengeArrow}>↗</Text>
        </Pressable>

        <View style={[styles.sectionHeader, isWide && styles.sectionHeaderWide]}>
          <Text style={styles.sectionEyebrow}>PLAYER OVERVIEW</Text>
          <Text style={styles.sectionTitle}>Your battlefield record</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{player.name.slice(0, 1).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.playerSub}>UID {player.uid} · {player.platform}</Text>
            </View>
            <View style={styles.rankBadge}><Text style={styles.rankLabel}>RANK</Text><Text style={styles.rankValue}>{player.rank}</Text></View>
          </View>
          <View style={styles.divider} />
          <View style={styles.statsGrid}>
            <Stat label="WIN RATE" value={`${player.winRate}%`} accent />
            <Stat label="K/D RATIO" value={kd} />
            <Stat label="WINS" value={String(player.wins)} />
            <Stat label="MATCHES" value={String(player.matches)} />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>HERO SPOTLIGHT</Text>
          <Text style={styles.sectionTitle}>Your top picks</Text>
        </View>
        <View style={[styles.heroRow, isWide && styles.heroRowWide]}>
          {player.heroes.map((hero, index) => (
            <View key={hero.name} style={styles.heroCard}>
              <View style={[styles.heroIcon, index === 0 ? styles.heroIconHot : null]}><Text style={styles.heroInitial}>{hero.name.slice(0, 1)}</Text></View>
              <Text style={styles.heroName}>{hero.name}</Text>
              <Text style={styles.heroMeta}>{hero.matches} MATCHES</Text>
              <Text style={styles.heroWin}>{hero.winRate}% WIN RATE</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>RECENT ACTIVITY</Text>
          <Text style={styles.sectionTitle}>Recent results</Text>
        </View>
        <View style={styles.matchList}>
          <View style={styles.matchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.matchHero}>Match history unavailable</Text>
              <Text style={styles.matchMeta}>The current stats provider does not expose recent match results.</Text>
            </View>
          </View>
        </View>
            </View>
          ))}
        </View>

        <View style={styles.liveCard}>
          <View style={styles.liveHeader}><View style={styles.liveDot} /><Text style={styles.liveTitle}>LIVE MATCH COMPANION</Text><Text style={styles.comingSoon}>IN DEVELOPMENT</Text></View>
          <Text style={styles.liveCopy}>A paired Windows companion is planned to relay supported match events to this phone. Live console tracking is not available yet.</Text>
        </View>

        <Text style={styles.footer}>RIVALS INTEL · UNOFFICIAL FAN PROJECT</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 42, gap: 18, width: "100%", alignSelf: "center" },
  contentWide: { maxWidth: 1180, paddingHorizontal: 34, paddingTop: 34, paddingBottom: 64, gap: 22 },
  topline: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  eyebrow: { color: colors.muted, fontSize: 9, letterSpacing: 2.2, fontWeight: "800" },
  brand: { color: colors.text, fontSize: 25, fontWeight: "900", letterSpacing: 1.4, marginTop: 4 },
  brandAccent: { color: colors.accent },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, borderColor: colors.border, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: colors.accent },
  statusText: { color: colors.text, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  searchRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  searchInput: { flex: 1, backgroundColor: colors.panel, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 13 },
  searchButton: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 15, justifyContent: "center", minWidth: 82, alignItems: "center" },
  searchButtonText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
  notice: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: -10 },
  challengeCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#191526", borderWidth: 1, borderColor: "#59436F", borderRadius: 14, padding: 15 },
  challengeEyebrow: { color: colors.accent, fontSize: 8, fontWeight: "900", letterSpacing: 1.5 },
  challengeTitle: { color: colors.text, fontSize: 16, fontWeight: "900", marginTop: 3 },
  challengeCopy: { color: colors.muted, fontSize: 10, marginTop: 4 },
  challengeArrow: { color: colors.accent, fontSize: 24, fontWeight: "900" },
  sectionHeader: { gap: 4, marginTop: 8 },
  sectionHeaderWide: { marginTop: 14 },
  sectionEyebrow: { color: colors.accent, fontSize: 9, fontWeight: "900", letterSpacing: 1.8 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  profileCard: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16 },
  profileTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#29253A", borderWidth: 1, borderColor: "#59436F", alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.accent, fontSize: 22, fontWeight: "900" },
  playerName: { color: colors.text, fontSize: 17, fontWeight: "800" },
  playerSub: { color: colors.muted, fontSize: 10, marginTop: 4 },
  rankBadge: { backgroundColor: "#242033", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8, alignItems: "center" },
  rankLabel: { color: colors.muted, fontSize: 8, letterSpacing: 1.4, fontWeight: "800" },
  rankValue: { color: "#D7B7FF", fontSize: 13, fontWeight: "900", marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 18 },
  stat: { width: "50%", gap: 3, position: "relative" },
  statValue: { color: colors.text, fontSize: 23, fontWeight: "900", fontVariant: ["tabular-nums"] },
  statLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  statAccent: { width: 18, height: 2, backgroundColor: colors.accent, marginTop: 3, borderRadius: 2 },
  heroRow: { flexDirection: "row", gap: 9, flexWrap: "wrap" },
  heroRowWide: { gap: 14 },
  heroCard: { flex: 1, minWidth: 145, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 13, padding: 11 },
  heroIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#22283A", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  heroIconHot: { backgroundColor: "#3A2530" },
  heroInitial: { color: colors.text, fontWeight: "900", fontSize: 16 },
  heroName: { color: colors.text, fontWeight: "800", fontSize: 12 },
  heroMeta: { color: colors.muted, fontSize: 8, marginTop: 5 },
  heroWin: { color: colors.accent, fontSize: 8, fontWeight: "800", marginTop: 5 },
  matchList: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13 },
  matchRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 13, borderBottomColor: colors.border, borderBottomWidth: 1 },
  resultBar: { width: 3, height: 34, borderRadius: 4 },
  winBar: { backgroundColor: colors.good },
  lossBar: { backgroundColor: colors.bad },
  matchHero: { color: colors.text, fontSize: 12, fontWeight: "800" },
  matchMode: { color: colors.muted, fontWeight: "500" },
  matchMeta: { color: colors.muted, fontSize: 9, marginTop: 5 },
  matchNumbers: { alignItems: "flex-end", gap: 4 },
  matchResult: { fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  winText: { color: colors.good },
  lossText: { color: colors.bad },
  matchKda: { color: colors.text, fontSize: 11, fontWeight: "800", fontVariant: ["tabular-nums"] },
  liveCard: { borderRadius: 14, backgroundColor: "#171523", borderWidth: 1, borderColor: "#453454", padding: 15, gap: 10 },
  liveHeader: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  liveTitle: { color: colors.text, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  comingSoon: { color: colors.accent, fontSize: 8, fontWeight: "900", marginLeft: "auto" },
  liveCopy: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  footer: { color: "#555A6B", fontSize: 8, fontWeight: "800", letterSpacing: 1.5, textAlign: "center", marginTop: 8 }
});