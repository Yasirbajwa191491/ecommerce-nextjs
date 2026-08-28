import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Appearance,
  ColorSchemeName,
  useColorScheme as useSystemColorScheme,
} from "react-native";

import {
  createShadows,
  createTextStyles,
  type ColorPalette,
  type ColorScheme,
  type ThemePreference,
  resolveColorScheme,
  getColors,
} from "@/constants/theme";
import {
  readAppPreferences,
  setThemePreference as persistThemePreference,
  updateAppPreferences,
} from "@/lib/preferences/storage";
import {
  DEFAULT_APP_PREFERENCES,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_SHOPPING_PREFERENCES,
  type AppPreferences,
  NotificationPreferences,
  ShoppingPreferences,
} from "@/lib/preferences/types";

type ThemeContextValue = {
  isReady: boolean;
  colorScheme: ColorScheme;
  preference: ThemePreference;
  colors: ColorPalette;
  textStyles: ReturnType<typeof createTextStyles>;
  shadows: ReturnType<typeof createShadows>;
  isDark: boolean;
  reduceMotion: boolean;
  preferences: AppPreferences;
  setThemePreference: (preference: ThemePreference) => void;
  setNotificationPreferences: (patch: Partial<NotificationPreferences>) => void;
  setShoppingPreferences: (patch: Partial<ShoppingPreferences>) => void;
  resetPreferences: () => Promise<void>;
  refreshPreferences: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [preferences, setPreferences] = useState<AppPreferences | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [appearanceScheme, setAppearanceScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const prefs = await readAppPreferences();
      if (mounted) {
        setPreferences(prefs);
        setPreference(prefs.theme);
        setIsReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setAppearanceScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => setReduceMotion(enabled)
    );
    return () => sub.remove();
  }, []);

  const resolvedSystemScheme: ColorScheme =
    (preference === "system" ? appearanceScheme : systemScheme) === "dark"
      ? "dark"
      : "light";

  const colorScheme = resolveColorScheme(preference, resolvedSystemScheme);
  const colors = useMemo(() => getColors(colorScheme), [colorScheme]);
  const textStyles = useMemo(() => createTextStyles(colors), [colors]);
  const shadows = useMemo(() => createShadows(colorScheme), [colorScheme]);

  const setThemePreference = useCallback((next: ThemePreference) => {
    setPreference(next);
    void persistThemePreference(next).then((prefs) => setPreferences(prefs));
  }, []);

  const setNotificationPreferences = useCallback(
    (patch: Partial<NotificationPreferences>) => {
      setPreferences((prev) => {
        const current = prev?.notifications ?? DEFAULT_NOTIFICATION_PREFERENCES;
        const nextNotifications = { ...current, ...patch };
        const optimistic = prev
          ? { ...prev, notifications: nextNotifications }
          : {
              version: 1,
              theme: preference,
              notifications: nextNotifications,
              shopping: DEFAULT_SHOPPING_PREFERENCES,
            };
        void updateAppPreferences({ notifications: nextNotifications }).then((prefs) =>
          setPreferences(prefs)
        );
        return optimistic;
      });
    },
    [preference]
  );

  const setShoppingPreferences = useCallback(
    (patch: Partial<ShoppingPreferences>) => {
      setPreferences((prev) => {
        const current = prev?.shopping ?? DEFAULT_SHOPPING_PREFERENCES;
        const nextShopping = { ...current, ...patch };
        const optimistic = prev
          ? { ...prev, shopping: nextShopping }
          : {
              version: 1,
              theme: preference,
              notifications: DEFAULT_NOTIFICATION_PREFERENCES,
              shopping: nextShopping,
            };
        void updateAppPreferences({ shopping: nextShopping }).then((prefs) =>
          setPreferences(prefs)
        );
        return optimistic;
      });
    },
    [preference]
  );

  const resetPreferences = useCallback(async () => {
    const prefs = await readAppPreferences();
    setPreferences(prefs);
    setPreference(prefs.theme);
  }, []);

  const refreshPreferences = useCallback(async () => {
    const prefs = await readAppPreferences();
    setPreferences(prefs);
    setPreference(prefs.theme);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      isReady,
      colorScheme,
      preference,
      colors,
      textStyles,
      shadows,
      isDark: colorScheme === "dark",
      reduceMotion,
      preferences: preferences ?? { ...DEFAULT_APP_PREFERENCES, theme: preference },
      setThemePreference,
      setNotificationPreferences,
      setShoppingPreferences,
      resetPreferences,
      refreshPreferences,
    }),
    [
      isReady,
      colorScheme,
      preference,
      colors,
      textStyles,
      shadows,
      reduceMotion,
      preferences,
      setThemePreference,
      setNotificationPreferences,
      setShoppingPreferences,
      resetPreferences,
      refreshPreferences,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

export function useThemeOptional(): ThemeContextValue | null {
  return useContext(ThemeContext);
}

export function useThemeColors(): ColorPalette {
  return useTheme().colors;
}
