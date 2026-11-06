import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { colors } from "@/theme/colors";

const links = [
  { label: "OVERVIEW", path: "/" },
  { label: "HEROES", path: "/heroes" },
  { label: "MATCH HISTORY", path: "/matches" },
  { label: "ACCOUNT", path: "/account" }
];

export function WebNav() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <View style={styles.inner}>
        <Pressable onPress={() => router.push("/")} style={styles.brand}>
          <Text style={styles.brandText}>RIVALS <Text style={styles.brandAccent}>INTEL</Text></Text>
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.links}>
          {links.map(link => {
            const active = pathname === link.path || (link.path !== "/" && pathname.startsWith(link.path));
            return <Pressable key={link.path} onPress={() => router.push(link.path as never)} style={[styles.link, active && styles.activeLink]}>
              <Text style={[styles.linkText, active && styles.activeText]}>{link.label}</Text>
            </Pressable>;
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: "#0D1019" },
  inner: { width: "100%", maxWidth: 1240, alignSelf: "center", minHeight: 66, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", gap: 28 },
  brand: { paddingVertical: 14 },
  brandText: { color: colors.text, fontSize: 17, fontWeight: "900", letterSpacing: 1.2 },
  brandAccent: { color: colors.accent },
  links: { alignItems: "center", gap: 6 },
  link: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 8 },
  activeLink: { backgroundColor: "#211B30" },
  linkText: { color: colors.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  activeText: { color: colors.accent }
});
