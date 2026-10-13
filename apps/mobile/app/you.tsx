import { router, type Href } from "expo-router";
import { ScrollView, View } from "react-native";
import { Header } from "@/components/layout/Header";
import { MobileFooter } from "@/components/layout/MobileFooter";
import { ThemedScreen } from "@/components/layout/ThemedScreen";
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsSection";

const shoppingLinks = [
  { title: "Your orders", icon: "receipt-outline", href: "/orders" },
  { title: "Wishlist", icon: "heart-outline", href: "/wishlist" },
  { title: "Offers", icon: "pricetag-outline", href: "/promotions" },
  { title: "Notifications", icon: "notifications-outline", href: "/notifications" },
  { title: "Scan a QR code", icon: "scan-outline", href: "/scan" },
  { title: "Appearance & preferences", icon: "settings-outline", href: "/settings" },
] as const;

export default function YouScreen() {
  return (
    <ThemedScreen edges={["bottom"]}>
      <Header title="You" subtitle="Your shopping, help and preferences" showBack showSearch={false} />
      <ScrollView contentContainerStyle={{ width: "100%", maxWidth: 760, alignSelf: "center", paddingBottom: 24 }}>
        <View style={{ padding: 16 }}>
          <SettingsSection title="Your shopping">
            {shoppingLinks.map((link) => <SettingsRow key={link.href} label={link.title} showChevron onPress={() => router.push(link.href as Href)} />)}
          </SettingsSection>
        </View>
        <MobileFooter expanded compactBottom />
      </ScrollView>
    </ThemedScreen>
  );
}
