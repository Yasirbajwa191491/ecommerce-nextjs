import { StyleSheet, View } from "react-native";

import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/layout/Header";
import { TrackOrderView } from "@/components/tracking/TrackOrderView";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";

export default function TrackScreen() {
  const rootStyle = useScreenRootStyle();

  return (
    <ScreenContainer>
      <View style={[styles.container, rootStyle]}>
        <Header title="Track Order" showSearch={false} showCart={false} />
        <TrackOrderView />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
