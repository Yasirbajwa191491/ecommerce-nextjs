import { View, StyleSheet } from "react-native";

import { AboutPageContent } from "@/components/about/AboutPageContent";
import { Header } from "@/components/layout/Header";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { colors } from "@/constants/theme";

export default function AboutScreen() {
  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Header title="About" showBack showSearch={false} showCart={false} />
        <AboutPageContent />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
