import { useAction, useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import {
  CANCELLATION_REASONS,
  CancelOrderDialog,
} from "@/components/orders/CancelOrderDialog";
import { CancelOrderAction } from "@/components/orders/CancelOrderAction";
import { OrderReceiptImage } from "@/components/orders/OrderReceiptImage";
import { ReceiptActionsRow } from "@/components/orders/ReceiptActionsRow";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { api } from "@/lib/convex-api";
import { getFriendlyErrorMessage, logAppError } from "@/lib/errors";
import { ensureOnlineNow } from "@/lib/network";
import {
  canShowCancelAction,
  canShowReceiptActions,
  canShowReorderAction,
} from "@/lib/order-actions";
import type { OrderReceiptData } from "@/lib/order-receipt-format";
import {
  captureReceiptImage,
  saveReceiptImageToGallery,
  shareReceiptImage,
} from "@/lib/order-receipt-image";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/order-display";
import { useCart } from "@/providers/cart-context";
import { useToast } from "@/providers/toast-context";
import type { Id } from "@convex/_generated/dataModel";
import type { Product } from "@/types/product";

type ReorderAvailableLine = {
  productId: Id<"products">;
  productName: string;
  color: string;
  quantity: number;
  requestedQuantity: number;
  currentPrice: number;
  currency: string;
  stock: number;
  imageUrl: string;
  colors: string[];
};

type ReorderUnavailableLine = {
  productId: string;
  productName: string;
  color: string;
  reasonLabel: string;
};

function toCartProduct(item: ReorderAvailableLine): Product {
  return {
    _id: item.productId,
    _creationTime: 0,
    name: item.productName,
    price: item.currentPrice,
    stock: item.stock,
    colors: item.colors,
    currency: item.currency,
    image: item.imageUrl ? [{ url: item.imageUrl }] : [],
    company: "",
    description: "",
    shipping: 0,
    stars: 0,
    categoryId: "" as Id<"productCategories">,
    externalId: item.productId,
  } as unknown as Product;
}

type OrderActionsProps = {
  orderNumber: string;
  customerEmail?: string;
  accessToken?: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod | string;
  paymentStatus: PaymentStatus | string;
  hasVerifiedAccess: boolean;
};

export function OrderActions({
  orderNumber,
  customerEmail,
  accessToken,
  status,
  paymentMethod,
  paymentStatus,
  hasVerifiedAccess,
}: OrderActionsProps) {
  const styles = useThemedStyles(createOrderActionsStyles);
  const { showError, showSuccess } = useToast();
  const isOnline = useOnlineStatus();
  const { cart, addToCart, clearCart } = useCart();

  const getOrderReceipt = useAction(api.orderReceipt.getOrderReceipt);
  const cancelOrder = useMutation(api.orders.cancelOrder);

  const cancellationEligibility = useQuery(
    api.orders.getOrderCancellationEligibility,
    hasVerifiedAccess && orderNumber
      ? { orderNumber, customerEmail, accessToken }
      : "skip"
  );

  const reorderPreview = useQuery(
    api.orders.prepareReorder,
    hasVerifiedAccess && orderNumber
      ? { orderNumber, customerEmail, accessToken }
      : "skip"
  );

  const receiptCaptureRef = useRef<View>(null);
  const [receiptLoading, setReceiptLoading] = useState<"download" | "share" | null>(null);
  const [receiptForCapture, setReceiptForCapture] = useState<OrderReceiptData | null>(null);
  const [pendingReceiptAction, setPendingReceiptAction] = useState<"download" | "share" | null>(
    null
  );
  const [cancelVisible, setCancelVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>(CANCELLATION_REASONS[0].value);
  const [cancelling, setCancelling] = useState(false);
  const [reorderNoticeVisible, setReorderNoticeVisible] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [cartMergeVisible, setCartMergeVisible] = useState(false);
  const [pendingReorderProducts, setPendingReorderProducts] = useState<
    Array<{ product: Product; color: string; quantity: number }>
  >([]);

  const actionContext = useMemo(
    () => ({
      status,
      paymentMethod,
      paymentStatus,
      hasVerifiedAccess,
    }),
    [status, paymentMethod, paymentStatus, hasVerifiedAccess]
  );

  const showReceipt = canShowReceiptActions(actionContext);
  const showCancel = canShowCancelAction({
    hasVerifiedAccess,
    canCancel: cancellationEligibility?.canCancel,
  });
  const showReorder = canShowReorderAction({
    hasVerifiedAccess,
    canReorder: reorderPreview?.canReorder,
  });

  const receiptLabels = useMemo(() => {
    const isPendingStripe =
      paymentMethod === "stripe" && paymentStatus === "pending" && status === "pending";
    if (isPendingStripe) {
      return { downloadLabel: "Download Summary", shareLabel: "Share Summary" };
    }
    return { downloadLabel: "Download Receipt", shareLabel: "Share Receipt" };
  }, [paymentMethod, paymentStatus, status]);

  const fetchReceipt = useCallback(async (): Promise<OrderReceiptData | null> => {
    try {
      await ensureOnlineNow("Connect to the internet to generate your receipt.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "You're offline.");
      return null;
    }

    const result = await getOrderReceipt({ orderNumber, customerEmail, accessToken });
    if (!result.found) {
      showError(result.message ?? "Unable to generate receipt.");
      return null;
    }
    return result.receipt as OrderReceiptData;
  }, [accessToken, customerEmail, getOrderReceipt, orderNumber, showError]);

  const queueReceiptCapture = useCallback(
    async (mode: "download" | "share") => {
      setReceiptLoading(mode);
      try {
        const receipt = await fetchReceipt();
        if (!receipt) {
          setReceiptLoading(null);
          return;
        }
        setReceiptForCapture(receipt);
        setPendingReceiptAction(mode);
      } catch (error) {
        logAppError(error, { segment: "receipt-fetch" });
        showError(getFriendlyErrorMessage(error, "Couldn't generate the receipt."));
        setReceiptLoading(null);
      }
    },
    [fetchReceipt, showError]
  );

  useEffect(() => {
    if (!receiptForCapture || !pendingReceiptAction) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const imageUri = await captureReceiptImage(receiptCaptureRef);
          if (cancelled) return;

          if (pendingReceiptAction === "download") {
            await saveReceiptImageToGallery(imageUri);
            showSuccess("Receipt saved to your photos.");
          } else {
            await shareReceiptImage(imageUri, receiptForCapture.receiptTitle);
          }
        } catch (error) {
          if (cancelled) return;
          const message = getFriendlyErrorMessage(
            error,
            pendingReceiptAction === "download"
              ? "Couldn't save the receipt."
              : "Couldn't share the receipt."
          );
          if (
            pendingReceiptAction !== "share" ||
            !message.toLowerCase().includes("cancel")
          ) {
            logAppError(error, {
              segment:
                pendingReceiptAction === "download" ? "receipt-download" : "receipt-share",
            });
            showError(message);
          }
        } finally {
          if (!cancelled) {
            setReceiptForCapture(null);
            setPendingReceiptAction(null);
            setReceiptLoading(null);
          }
        }
      })();
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pendingReceiptAction, receiptForCapture, showError, showSuccess]);

  const handleCancelOrder = useCallback(async () => {
    if (!isOnline) {
      showError("Connect to the internet to cancel your order.");
      return;
    }
    setCancelling(true);
    try {
      const result = await cancelOrder({
        orderNumber,
        customerEmail,
        accessToken,
        cancellationReason: cancelReason,
      });
      if (!result.success) {
        showError(result.message ?? "Unable to cancel this order.");
        return;
      }
      setCancelVisible(false);
      if (result.refundPending) {
        showSuccess("Order cancelled. Your refund is being processed.");
      } else if (result.alreadyCancelled) {
        showSuccess("This order was already cancelled.");
      } else {
        showSuccess("Your order has been cancelled.");
      }
    } catch (error) {
      logAppError(error, { segment: "order-cancel" });
      showError(getFriendlyErrorMessage(error, "Unable to cancel this order."));
    } finally {
      setCancelling(false);
    }
  }, [
    accessToken,
    cancelOrder,
    cancelReason,
    customerEmail,
    isOnline,
    orderNumber,
    showError,
    showSuccess,
  ]);

  const applyReorderToCart = useCallback(
    (mode: "merge" | "replace") => {
      if (mode === "replace") {
        clearCart();
      }
      for (const entry of pendingReorderProducts) {
        addToCart(entry.product, entry.color, entry.quantity);
      }
      setCartMergeVisible(false);
      setReorderNoticeVisible(false);
      showSuccess("Items added to cart.");
      router.push("/(tabs)/cart");
    },
    [addToCart, clearCart, pendingReorderProducts, showSuccess]
  );

  const continueReorder = useCallback(async () => {
    if (!reorderPreview?.found || !reorderPreview.canReorder) {
      showError(reorderPreview?.message ?? "This order cannot be reordered.");
      return;
    }
    if (!reorderPreview.available?.length) {
      showError("None of the items from this order are available right now.");
      return;
    }
    try {
      await ensureOnlineNow("Connect to the internet to reorder.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "You're offline.");
      return;
    }

    const available = reorderPreview.available as ReorderAvailableLine[];
    const products = available.map((item) => ({
      product: toCartProduct(item),
      color: item.color,
      quantity: item.quantity,
    }));

    setPendingReorderProducts(products);
    if (cart.length > 0) {
      setCartMergeVisible(true);
    } else {
      applyReorderToCart("merge");
    }
  }, [applyReorderToCart, cart.length, reorderPreview, showError]);

  const handleReorderPress = useCallback(() => {
    if (!reorderPreview?.found || !reorderPreview.canReorder) {
      showError(reorderPreview?.message ?? "This order cannot be reordered.");
      return;
    }
    if (!reorderPreview.available?.length) {
      showError("None of the items from this order are available right now.");
      return;
    }
    const availableLines = (reorderPreview.available ?? []) as ReorderAvailableLine[];
    const hasPartialQuantities = availableLines.some(
      (item) => item.quantity < item.requestedQuantity
    );
    if ((reorderPreview.unavailable?.length ?? 0) > 0 || hasPartialQuantities) {
      setReorderNoticeVisible(true);
      return;
    }
    setReordering(true);
    void continueReorder().finally(() => setReordering(false));
  }, [continueReorder, reorderPreview, showError]);

  if (!showReceipt && !showCancel && !showReorder) {
    return null;
  }

  const unavailableItems = (reorderPreview?.unavailable ?? []) as ReorderUnavailableLine[];
  const quantityAdjustedItems = (
    (reorderPreview?.available ?? []) as ReorderAvailableLine[]
  ).filter((item) => item.quantity < item.requestedQuantity);
  const reorderNoticeTitle = unavailableItems.length
    ? "Some items are unavailable"
    : "Some quantities were updated";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order actions</Text>

      {showReceipt ? (
        <ReceiptActionsRow
          downloadLabel={receiptLabels.downloadLabel}
          shareLabel={receiptLabels.shareLabel}
          loading={receiptLoading}
          disabled={!isOnline}
          onDownload={() => void queueReceiptCapture("download")}
          onShare={() => void queueReceiptCapture("share")}
        />
      ) : null}

      {showReorder ? (
        <Button
          label={reordering ? "Adding items…" : "Reorder"}
          variant="secondary"
          loading={reordering}
          disabled={!isOnline || reordering}
          onPress={handleReorderPress}
          accessibilityLabel="Reorder previous items"
        />
      ) : null}

      {showCancel ? (
        <>
          {showReceipt || showReorder ? <View style={styles.actionDivider} /> : null}
          <CancelOrderAction
            disabled={!isOnline}
            loading={cancelling}
            onPress={() => setCancelVisible(true)}
          />
        </>
      ) : null}

      <CancelOrderDialog
        visible={cancelVisible}
        cancelling={cancelling}
        selectedReason={cancelReason}
        onSelectReason={setCancelReason}
        onKeepOrder={() => {
          if (!cancelling) setCancelVisible(false);
        }}
        onConfirmCancel={() => void handleCancelOrder()}
      />

      <ConfirmDialog
        visible={cartMergeVisible}
        title="Your cart has items"
        message="Add these products to your existing cart or replace the cart with this order?"
        confirmLabel="Replace cart"
        cancelLabel="Add to cart"
        onCancel={() => applyReorderToCart("merge")}
        onConfirm={() => applyReorderToCart("replace")}
      />

      {receiptForCapture ? (
        <View style={styles.captureHost} pointerEvents="none">
          <OrderReceiptImage ref={receiptCaptureRef} receipt={receiptForCapture} />
        </View>
      ) : null}

      <Modal
        visible={reorderNoticeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReorderNoticeVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setReorderNoticeVisible(false)}>
          <Pressable style={styles.dialog} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.dialogTitle}>{reorderNoticeTitle}</Text>
            <View style={styles.unavailableBlock}>
              {quantityAdjustedItems.map((item) => (
                <Text key={`${item.productId}-${item.color}-qty`} style={styles.unavailableItem}>
                  {item.productName} ({item.color}) — requested {item.requestedQuantity}, only{" "}
                  {item.quantity} in stock
                </Text>
              ))}
              {unavailableItems.map((item) => (
                <Text key={`${item.productId}-${item.color}`} style={styles.unavailableItem}>
                  {item.productName} ({item.color}) — {item.reasonLabel}
                </Text>
              ))}
            </View>
            <Text style={styles.dialogMessage}>
              You can continue with the items that are still available. Prices will reflect
              current catalog pricing at checkout.
            </Text>
            <Button
              label={reordering ? "Adding items…" : "Continue with available items"}
              loading={reordering}
              onPress={() => {
                setReordering(true);
                void continueReorder().finally(() => setReordering(false));
              }}
              fullWidth
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createOrderActionsStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    title: {
      ...textStyles.sectionTitle,
      fontSize: typography.base,
    },
    captureHost: {
      position: "absolute",
      left: -5000,
      top: 0,
      opacity: 0,
    },
    actionDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderLight,
      marginVertical: spacing.xs,
    },
    flexButton: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
    },
    dialog: {
      width: "100%",
      maxWidth: 380,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.xl,
      gap: spacing.md,
    },
    dialogTitle: {
      fontSize: typography.lg,
      fontWeight: "700",
      color: colors.foreground,
    },
    dialogMessage: {
      fontSize: typography.sm,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    unavailableBlock: {
      gap: spacing.xs,
      backgroundColor: colors.destructiveMuted,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    unavailableItem: {
      fontSize: typography.sm,
      color: colors.foreground,
    },
  });
}
