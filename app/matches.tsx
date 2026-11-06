import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebNav } from "@/components/WebNav";
import { demoMatches } from "@/services/demo";
import { colors } from "@/theme/colors";

export default function MatchesScreen() {
 const wins=demoMatches.filter(m=>m.result==="VICTORY").length;
 return <SafeAreaView style={styles.safe} edges={["bottom"]}>
  <WebNav />
  <ScrollView contentContainerStyle={styles.content}>
   <Text style={styles.eyebrow}>CAREER RECORD</Text>
   <Text style={styles.title}>Match history</Text>
   <Text style={styles.sub}>Review recent results and performance at a glance.</Text>
   <View style={styles.summary}>
    <View style={styles.summaryCell}><Text style={styles.summaryValue}>{demoMatches.length}</Text><Text style={styles.summaryLabel}>MATCHES SHOWN</Text></View>
    <View style={styles.summaryCell}><Text style={[styles.summaryValue,{color:colors.good}]}>{wins}</Text><Text style={styles.summaryLabel}>VICTORIES</Text></View>
    <View style={styles.summaryCell}><Text style={[styles.summaryValue,{color:colors.bad}]}>{demoMatches.length-wins}</Text><Text style={styles.summaryLabel}>DEFEATS</Text></View>
   </View>
   <View style={styles.list}>
    {demoMatches.map((match,index)=><View key={match.id} style={styles.row}>
     <View style={[styles.result,{backgroundColor:match.result==="VICTORY"?colors.good:colors.bad}]}/>
     <View style={styles.index}><Text style={styles.indexText}>0{index+1}</Text></View>
     <View style={{flex:1,minWidth:120}}><Text style={styles.hero}>{match.hero}</Text><Text style={styles.meta}>{match.mode} · {match.map}</Text></View>
     <View style={styles.kda}><Text style={[styles.outcome,{color:match.result==="VICTORY"?colors.good:colors.bad}]}>{match.result}</Text><Text style={styles.kdaText}>{match.kills} / {match.deaths} / {match.assists}</Text></View>
    </View>)}
   </View>
   <View style={styles.note}><Text style={styles.noteTitle}>HISTORY CONNECTION</Text><Text style={styles.noteText}>This page currently uses clearly labelled sample matches. Once the API proxy is configured, we'll connect completed match history and show its update time. No restricted live-match telemetry is used.</Text></View>
   <Text style={styles.footer}>RIVALS INTEL · UNOFFICIAL FAN PROJECT</Text>
  </ScrollView>
 </SafeAreaView>;
}
const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.background},content:{width:"100%",maxWidth:1180,alignSelf:"center",padding:24,gap:12},
 eyebrow:{color:colors.accent,fontSize:10,fontWeight:"900",letterSpacing:2,marginTop:18},title:{color:colors.text,fontSize:30,fontWeight:"900"},sub:{color:colors.muted,fontSize:13,marginBottom:14},
 summary:{flexDirection:"row",flexWrap:"wrap",backgroundColor:colors.panel,borderWidth:1,borderColor:colors.border,borderRadius:14,padding:17,gap:20},summaryCell:{flex:1,minWidth:100,gap:5},summaryValue:{color:colors.text,fontSize:24,fontWeight:"900"},summaryLabel:{color:colors.muted,fontSize:8,fontWeight:"900",letterSpacing:1},
 list:{backgroundColor:colors.panel,borderWidth:1,borderColor:colors.border,borderRadius:14,paddingHorizontal:15},row:{flexDirection:"row",alignItems:"center",gap:12,paddingVertical:17,borderBottomWidth:1,borderBottomColor:colors.border},result:{width:3,height:38,borderRadius:3},index:{width:28,height:28,borderRadius:8,backgroundColor:"#22283A",alignItems:"center",justifyContent:"center"},indexText:{color:colors.muted,fontSize:9,fontWeight:"900"},hero:{color:colors.text,fontSize:13,fontWeight:"800"},meta:{color:colors.muted,fontSize:10,marginTop:5},kda:{alignItems:"flex-end",gap:5},outcome:{fontSize:8,fontWeight:"900",letterSpacing:1},kdaText:{color:colors.text,fontSize:11,fontWeight:"800"},
 note:{backgroundColor:"#171523",borderColor:"#453454",borderWidth:1,borderRadius:12,padding:16,marginTop:12,gap:8},noteTitle:{color:colors.accent,fontSize:9,fontWeight:"900",letterSpacing:1.5},noteText:{color:colors.muted,fontSize:12,lineHeight:19},footer:{color:"#555A6B",fontSize:8,fontWeight:"800",letterSpacing:1.5,textAlign:"center",marginTop:24}
});
