"use client";

import { ThemeProvider } from "styled-components";
import { ReactNode } from "react";
import { theme } from "@/lib/theme";
import { GlobalStyle } from "@/styles/GlobalStyle";
import { FilterContextProvider } from "@/context/filter_context";
import { CartProvider } from "@/context/cart_context";
import { ProductPromotionBadgesProvider } from "@/context/product-promotion-badges-context";
import { MotionProvider } from "@/components/motion";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <MotionProvider>
        <FilterContextProvider>
          <CartProvider>
            <ProductPromotionBadgesProvider>{children}</ProductPromotionBadgesProvider>
          </CartProvider>
        </FilterContextProvider>
      </MotionProvider>
    </ThemeProvider>
  );
}
