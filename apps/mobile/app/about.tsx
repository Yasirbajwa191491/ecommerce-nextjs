import { View, StyleSheet } from "react-native";

import { AboutPageContent } from "@/components/about/AboutPageContent";
import { Header } from "@/components/layout/Header";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";

export default function AboutScreen() {
  const rootStyle = useScreenRootStyle();

  return (
    <ScreenContainer>
      <View style={[styles.container, rootStyle]}>
        <Header title="About" showBack showSearch={false} showCart={false} />
        <AboutPageContent />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
