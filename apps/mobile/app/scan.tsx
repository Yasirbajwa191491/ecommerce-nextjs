import { CameraView, useCameraPermissions } from "expo-camera";
import * as Linking from "expo-linking";
import { router, type Href } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/feedback/EmptyState";
import { OfflineNotice } from "@/components/feedback/OfflineNotice";
import { Header } from "@/components/layout/Header";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { useTheme } from "@/providers/theme-context";
import { triggerHaptic } from "@/lib/haptics";
import { rewriteLegacyTrackOrderPath } from "@/lib/qr-deep-links";
import { parseQrPayload } from "@/lib/qr-links";

export default function ScanScreen() {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { isOffline } = useNetworkStatus();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const lockRef = useRef(false);

  const handlePayload = useCallback(async (raw: string) => {
    if (lockRef.current) return;
    const value = raw.trim();
    if (!value) return;

    const parsed = parseQrPayload(value);
    if (parsed) {
      lockRef.current = true;
      await triggerHaptic("success");
      router.push({
        pathname: "/qr/[type]/[token]",
        params: { type: parsed.type, token: parsed.token },
      } as unknown as Href);
      setTimeout(() => {
        lockRef.current = false;
      }, 1500);
      return;
    }

    if (value.includes("/track-order/")) {
      lockRef.current = true;
      await triggerHaptic("success");
      router.push(rewriteLegacyTrackOrderPath(value) as Href);
      setTimeout(() => {
        lockRef.current = false;
      }, 1500);
      return;
    }

    await triggerHaptic("error");
    setError("This QR code is not a store tracking, product, or payment code.");
  }, []);

  if (isOffline) {
    return (
      <ScreenContainer>
        <View style={styles.flex}>
          <Header title="Scan QR" showBack showSearch={false} showCart={false} />
          <View style={styles.padded}>
            <OfflineNotice message="Internet connection required to validate a QR code." />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (!permission) {
    return (
      <ScreenContainer>
        <Header title="Scan QR" showBack showSearch={false} showCart={false} />
      </ScreenContainer>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenContainer>
        <View style={styles.flex}>
          <Header title="Scan QR" showBack showSearch={false} showCart={false} />
          <EmptyState
            icon="camera-outline"
            title="Camera access needed"
            description={
              permission.canAskAgain
                ? "Allow camera access to scan order, product, and payment QR codes."
                : "Camera access is disabled. Enable it in Settings to scan QR codes."
            }
            actionLabel={permission.canAskAgain ? "Allow camera" : "Open Settings"}
            onAction={() => {
              if (permission.canAskAgain) {
                void requestPermission();
                return;
              }
              void Linking.openSettings();
            }}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.flex}>
        <Header title="Scan QR" showBack showSearch={false} showCart={false} />
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => {
              void handlePayload(data);
            }}
          />
          <View style={styles.frame} accessibilityElementsHidden />
          <Text style={styles.hint}>Align the QR code inside the frame</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={torch ? "Turn flashlight off" : "Turn flashlight on"}
            onPress={() => setTorch((current) => !current)}
            style={[styles.torch, { bottom: insets.bottom + spacing.lg }]}
          >
            <Text style={styles.torchLabel}>{torch ? "Flashlight on" : "Flashlight"}</Text>
          </Pressable>
        </View>
        <View style={styles.manual}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Input
            label="Or paste a QR link"
            value={manualValue}
            onChangeText={(text) => {
              setManualValue(text);
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://yourstore.com/qr/order/…"
          />
          <Button
            label="Open link"
            onPress={() => void handlePayload(manualValue)}
            accessibilityLabel="Open pasted QR link"
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

function createStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    padded: { padding: spacing.xl },
    cameraWrap: {
      height: 360,
      marginHorizontal: spacing.lg,
      borderRadius: radius.lg,
      overflow: "hidden",
      backgroundColor: "#111827",
      alignItems: "center",
      justifyContent: "center",
    },
    frame: {
      width: 220,
      height: 220,
      borderWidth: 2,
      borderColor: "#ffffff",
      borderRadius: radius.md,
    },
    hint: {
      position: "absolute",
      bottom: spacing.lg,
      color: "#ffffff",
      fontSize: typography.sm,
      textAlign: "center",
    },
    torch: {
      position: "absolute",
      minHeight: 44,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.full,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
    torchLabel: { color: "#ffffff", fontWeight: "600" },
    manual: {
      padding: spacing.xl,
      gap: spacing.md,
    },
    error: {
      color: colors.destructive,
      fontSize: typography.sm,
    },
  });
}
