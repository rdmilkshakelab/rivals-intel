import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebNav } from "@/components/WebNav";
import { demoPlayer } from "@/services/demo";
import { colors } from "@/theme/colors";

export default function HeroesScreen() {
  return <SafeAreaView style={styles.safe} edges={["bottom"]}>
    <WebNav />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>HERO INTELLIGENCE</Text>
      <Text style={styles.title}>Hero performance</Text>
      <Text style={styles.sub}>A closer look at the heroes in this sample player profile.</Text>
      <View style={styles.grid}>
        {demoPlayer.heroes.map((hero, index) => <View key={hero.name} style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.icon, index === 0 && styles.iconHot]}><Text style={styles.initial}>{hero.name.slice(0,1)}</Text></View>
            <View style={{flex:1}}><Text style={styles.name}>{hero.name}</Text><Text style={styles.meta}>{index === 0 ? "MOST PLAYED" : "PLAYER PICK"}</Text></View>
            <Text style={styles.rate}>{hero.winRate}%</Text>
          </View>
          <View style={styles.track}><View style={[styles.fill,{width:hero.winRate+"%"}]}/></View>
          <View style={styles.bottom}><Text style={styles.label}>MATCHES</Text><Text style={styles.value}>{hero.matches}</Text><Text style={styles.label}>WIN RATE</Text><Text style={styles.value}>{hero.winRate}%</Text></View>
        </View>)}
      </View>
      <View style={styles.note}><Text style={styles.noteTitle}>PROFILE DATA</Text><Text style={styles.noteText}>These values are sample data until a real player profile is loaded from the configured stats service. We will expand this page when the API's full hero breakdown is connected.</Text></View>
      <Text style={styles.footer}>RIVALS INTEL · UNOFFICIAL FAN PROJECT</Text>
    </ScrollView>
  </SafeAreaView>;
}
const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},content:{width:"100%",maxWidth:1180,alignSelf:"center",padding:24,gap:12},
 eyebrow:{color:colors.accent,fontSize:10,fontWeight:"900",letterSpacing:2,marginTop:18},title:{color:colors.text,fontSize:30,fontWeight:"900"},sub:{color:colors.muted,fontSize:13,marginBottom:14},
 grid:{flexDirection:"row",flexWrap:"wrap",gap:14},card:{backgroundColor:colors.panel,borderColor:colors.border,borderWidth:1,borderRadius:14,padding:17,minWidth:260,flexGrow:1,flexBasis:300},
 cardTop:{flexDirection:"row",alignItems:"center",gap:12},icon:{width:44,height:44,borderRadius:12,backgroundColor:"#22283A",alignItems:"center",justifyContent:"center"},iconHot:{backgroundColor:"#3A2530"},initial:{color:colors.text,fontSize:19,fontWeight:"900"},
 name:{color:colors.text,fontSize:15,fontWeight:"800"},meta:{color:colors.muted,fontSize:8,fontWeight:"800",letterSpacing:1,marginTop:4},rate:{color:colors.good,fontSize:21,fontWeight:"900"},
 track:{height:6,backgroundColor:"#252B3B",borderRadius:5,overflow:"hidden",marginTop:20},fill:{height:6,backgroundColor:colors.accent,borderRadius:5},
 bottom:{flexDirection:"row",alignItems:"center",gap:8,marginTop:16},label:{color:colors.muted,fontSize:8,fontWeight:"800",letterSpacing:1},value:{color:colors.text,fontSize:12,fontWeight:"800",marginRight:12},
 note:{backgroundColor:"#171523",borderColor:"#453454",borderWidth:1,borderRadius:12,padding:16,marginTop:12,gap:8},noteTitle:{color:colors.accent,fontSize:9,fontWeight:"900",letterSpacing:1.5},noteText:{color:colors.muted,fontSize:12,lineHeight:19},footer:{color:"#555A6B",fontSize:8,fontWeight:"800",letterSpacing:1.5,textAlign:"center",marginTop:24}
});
