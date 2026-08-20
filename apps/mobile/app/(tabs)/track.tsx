import { View } from "react-native";

import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/layout/Header";
import { TrackOrderView } from "@/components/tracking/TrackOrderView";
import { colors } from "@/constants/theme";

export default function TrackScreen() {
  return (
    <ScreenContainer>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Track Order" showSearch={false} showCart={false} />
        <TrackOrderView />
      </View>
    </ScreenContainer>
  );
}
