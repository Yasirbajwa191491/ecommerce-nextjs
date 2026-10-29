import { OrderAccessRecovery } from "@/components/OrderAccessRecovery";
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
        <Header title="Orders" subtitle="Track a delivery or find your orders" showSearch={false} showCart={false} showNotifications showScan showSettings />
        <OrderAccessRecovery />
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
