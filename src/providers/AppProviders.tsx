"use client";

import { ThemeProvider } from "styled-components";
import { ReactNode } from "react";
import { theme } from "@/lib/theme";
import { GlobalStyle } from "@/styles/GlobalStyle";
import { FilterContextProvider } from "@/context/filter_context";
import { CartProvider } from "@/context/cart_context";
import { ProductPromotionBadgesProvider } from "@/context/product-promotion-badges-context";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <FilterContextProvider>
        <CartProvider>
          <ProductPromotionBadgesProvider>{children}</ProductPromotionBadgesProvider>
        </CartProvider>
      </FilterContextProvider>
    </ThemeProvider>
  );
}
