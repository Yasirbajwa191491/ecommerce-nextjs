# Mobile UX Guidelines

Guidelines for the Expo React Native mobile app (`apps/mobile`). Follow these conventions for consistency, accessibility, and maintainability.

## Theme Architecture

### Modes

- **Light** — always light palette
- **Dark** — always dark palette
- **System** (default) — follows OS appearance via `Appearance` / `useColorScheme`

### Implementation

| Piece | Location |
|-------|----------|
| Color palettes | `constants/theme.ts` — `lightColors`, `darkColors`, `ColorPalette` |
| Theme provider | `providers/theme-context.tsx` |
| Hook | `useTheme()` — `{ colors, textStyles, shadows, colorScheme, preference, isDark, reduceMotion }` |
| Preferences storage | `@preferences/v1` via `lib/preferences/storage.ts` |

### Rules

1. **Never hardcode hex colors in components.** Use `colors.background`, `colors.surface`, etc.
2. Use `useTheme().colors` or `useThemedStyles()` for dynamic styles.
3. Use `useScreenRootStyle()` for screen root backgrounds.
4. Static `import { colors } from "@/constants/theme"` is deprecated (light-only fallback).
5. `StatusBar` style follows effective theme: light content on dark, dark content on light.

### Semantic Tokens

`background`, `surface`, `surfaceSecondary`, `surfaceElevated`, `foreground`, `text`, `textSecondary`, `border`, `primary`, `primaryText`, `success`, `warning`, `error`, `overlay`, `destructive`, etc.

## Design Tokens

Non-color tokens live in `constants/theme.ts`:

- `spacing`, `radius`, `typography`, `fontWeight`, `touchTarget` (44px)
- `sizes` — button heights, icon sizes
- `layout` — max content width, grid columns
- `shadows` — theme-aware via `createShadows(scheme)`
- `animation` — press scale, durations

## Accessibility

### Required

- `accessibilityLabel` on all icon buttons and non-text controls
- `accessibilityRole` — `button`, `tab`, `switch`, `alert`, etc.
- `accessibilityState` — `selected`, `disabled`, `checked`, `busy`
- Descriptive labels: `"Add iPhone 15 to wishlist"` not `"Heart button"`
- Minimum touch target: 44×44 (use `hitSlop` or padding, not oversized visuals)

### Reduced Motion

- Detected via `AccessibilityInfo.isReduceMotionEnabled()`
- Exposed as `useTheme().reduceMotion`
- When enabled: disable press scale, skeleton shimmer, heavy transitions

### Font Scaling

- Respect system font size; use `maxFontSizeMultiplier` on dense layouts when needed

## Offline Rules

- **NetInfo** is the only authoritative network source — never `navigator.onLine` on native
- Unknown network state ≠ offline
- Online-only actions call `ensureOnlineNow()` before execution
- Do not auto-submit orders, payments, forms, or AI prompts when reconnecting
- Global banner: `OfflineBanner` — dismissible offline, auto “Back online”
- Per-screen: `OfflineNotice`, `CachedDataNotice`
- Cache prefix: `@offline/v1/` — see `lib/offline/`

## Storage Conventions

| Namespace | Key pattern | Purpose |
|-----------|-------------|---------|
| Preferences | `@preferences/v1` | Theme, notification/shopping prefs |
| Offline cache | `@offline/v1/*` | TTL-cached Convex data |
| Feature keys | `mobileCatalogLayout`, `mobile-recent-searches`, etc. | Feature-specific state |
| Shared cart | `yasirCart` | From `@ecommerce/shared` |

**Do not store:** passwords, payment cards, auth secrets, sensitive PII.

### Clear data actions

Settings → Data & Privacy: clear cache, searches, recently viewed, offline data, reset preferences. All use confirmation dialogs.

## Settings Architecture

Route: `/settings`

Sections: Appearance, Notifications, Shopping Preferences, Data & Privacy, About.

- Theme: radio-style `ThemeSelector`
- Toggles: local preference only until push infrastructure exists
- Destructive actions: `ConfirmDialog`
- Version: `expo-constants`

## Localization Strategy

- UI strings centralized in `lib/i18n/strings.ts`
- English only for now; structure supports future Urdu, Arabic, etc.
- Use logical layout (`flexDirection`, start/end) for RTL readiness
- Avoid fixed widths on buttons with long text
- Do not force RTL until translations exist

## Error Experience

- Customer-facing copy via `getFriendlyErrorMessage()` — no Convex/stack traces
- Patterns: `ErrorState`, `GlobalErrorView`, `ToastBanner`
- Never use `alert()` — use toast or inline error
- Always offer retry or navigation (Continue Shopping, Go Home)

## Performance Rules

- Use indexed Convex queries; no unbounded `.collect()`
- FlatList for large lists; stable `keyExtractor`
- Avoid nested vertical scroll lists
- Debounce search input; cancel stale results
- Use `expo-image` with placeholders and consistent dimensions
- Memoize expensive list items (`ProductCard` uses `memo`)
- Pull-to-refresh only on feed screens (Home, Shop, Category, Wishlist, Promotions)

## Navigation Conventions

- Tabs: Home, Shop, AI, Cart, Track — custom `PremiumTabBar`
- Stack screens use `Header` with `showBack`
- Settings accessible from Home header and footer
- Deep links: scheme `ecommerce://` — product, category, track, promotions routes configured in `app.config.ts`

## Haptic Feedback

- `lib/haptics.ts` — light/medium/success/warning/error
- Use sparingly: add to cart, wishlist toggle, checkout success, filter applied
- No haptics on web

## New Component Checklist

When adding UI:

1. Support light and dark via `useTheme()`
2. Add accessibility labels
3. Honor `reduceMotion`
4. Use semantic colors only
5. Touch targets ≥ 44px where interactive

## Reviews UI

Review components live in `components/reviews/` and are used on:

- **Product detail** — `ProductReviewSection` (list, filters, semantic search, AI summary)
- **Order detail / Track** — `OrderDeliveredReviews`, `OrderItemReviewPanel` (write/edit reviews)

All review components use `useTheme()` for semantic colors. Filter chips, review cards, forms, and star inputs support light/dark/system themes. Review forms use the shared `Input` component with labels and error states.
