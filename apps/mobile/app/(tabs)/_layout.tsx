import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#059669",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Shop",
          tabBarLabel: "Shop",
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "About",
          tabBarLabel: "About",
        }}
      />
    </Tabs>
  );
}
