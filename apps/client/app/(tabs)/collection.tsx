import { FlatList,Image,StyleSheet,TouchableOpacity} from "react-native";

import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Icon } from "@/components/Icon";
import { useFocusEffect } from "expo-router";
import { viewError } from "@/lib/utility";

type Badge = { badgeType: "new" | "+1" | "none" };

type Rule = {
  id: string;
  count: number;
  textEn: string;
  iconName: string;
  iconType: string;
  total: number;
  badge: Badge;
};

function chooseBadge(count: number, lastCollectedAt: Date): Badge {
  const now = new Date();
  if ((now.getTime() - lastCollectedAt.getTime()) / (1000 * 60) < 60) {
    if (count === 1) {
      return { badgeType: "new" };
    } else {
      return { badgeType: "+1" };
    }
  } else {
    return { badgeType: "none" };
  }
}

export default function CollectionTab() {
  const [signCount, setSignCount] = useState<number | null>(null);
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const res = await api.api.collection.$get();
        if (!res.ok) {
          const err = await res.json();
          await viewError(err.error);
          return;
        }
        const data = await res.json();
        setSignCount(data.signCount);
        setTotal(data.total);
        setRules(
          data.rules.map((i) => ({
            id: i.id,
            count: i.count,
            textEn: i.textEn,
            iconName: i.iconName,
            iconType: i.iconType,
            total: i.total,
            badge: chooseBadge(i.count, new Date(i.lastCollectedAt)),
          })),
        );
      })();

      return () => {
        setRules(null);
      };
    }, []),
  );
  return (
    <View style={styles.container}>
      {rules ? (
        <View style={styles.container}>
          <View style={styles.up}>
          <View style={styles.check}>
          <Text style={styles.font}>撮影した看板</Text>
          <Text style={styles.font2}>21</Text>
          <Text style={styles.font3}>個</Text>
          </View>
          <View style={styles.check2}>
          <Text style={styles.font}>訪れた公園</Text>
          <Text style={styles.font2}>17</Text>
          <Text style={styles.font3}>箇所</Text>
          </View>
          <Text　style={styles.title}>ルール一覧</Text>
          <View style={styles.line}></View>
        </View>
        <View style={styles.low}>
          <FlatList
        data={rules}
        renderItem={({item})=>(
  <View key={item.id} style={styles.rule}>
  <Icon name={item.iconName} iconType={item.iconType}></Icon>
  <Text style={styles.text}>{item.textEn}</Text>
  <Text style={styles.count}>{item.count}コ</Text>
{item.badge.badgeType === "new"&&<Text style={styles.new}>NEW</Text>}
{item.badge.badgeType === "+1"&&<Text style={styles.increment}>+1</Text>}
</View>
 )}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={()=><View style={styles.bar}/>}
        />
        </View>
        </View>
      ) : ( 
               <Text>読み込み中...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title:{
  position:"absolute",
  left:"3%",
  bottom:0,
  fontSize:20,
  fontWeight:"600"
  },
  bar:{
left:"3%",
height:3,
width:"94%",
backgroundColor:"black"
  },
   line:{
    position:"absolute",
    left:"3%",
    height:3,
    width:"94%",
    bottom:0,
    backgroundColor:"black"
  },
  container: {
    flex: 1,
  },
  low:{
    backgroundColor:"white",
    flex:3,
    flexDirection:"column",
  },
  up:{
    flex:1,
    backgroundColor:"white"
  },
  rule: {
    flexDirection: "row",
    left:"3%",
    width:"94%",  
    height:50,
    backgroundColor:"rgba(240, 239, 239, 0.93)"
  },
  check:{
    position:"absolute",
    borderWidth:2,
    width:"40%",
    height:"55%",
    top:"10%",
    left:"5%",
    borderRadius:10,
  },
  check2:{
    position:"absolute",
    borderWidth:2,
    width:"40%",
    height:"55%",
    top:"10%",
    right:"5%",
    borderRadius:10
  },
  font:{
    fontSize:17,
    fontWeight:"600"
  },
  font2:{
    fontSize:40,
    fontWeight:"600",
    textAlign:"center"
  },
  font3:{
    position:"absolute",
    left:"70%",
    top:"65%"
  },
  text:{
   position:"absolute",
   fontSize:18,
   fontWeight:"700",
   left:"12%",
   right:"18%",
   textAlignVertical:"center",
   height:50
  },
  count:{
   position:"absolute",
   fontSize:19,
   fontWeight:"700",
   left:"83%",
   top:"25%"
  },
  new:{
   position:"absolute",
   left:"89%",
   top:0,
   fontSize:13,
   paddingVertical:2,
   paddingHorizontal:5,
   color:"white",
   fontWeight:"700",
   backgroundColor:"rgb(251, 190, 7)",
   borderRadius:20
  },
  increment:{
  position:"absolute",
   left:"89%",
   top:0,
   fontSize:13,
   paddingVertical:1,
   paddingHorizontal:6,
   color:"white",
   fontWeight:"700",
   backgroundColor:"rgb(44, 188, 0)",
   borderRadius:20
  }
});
