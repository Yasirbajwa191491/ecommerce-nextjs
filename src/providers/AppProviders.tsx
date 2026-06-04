"use client";

import { ThemeProvider } from "styled-components";
import { ReactNode } from "react";
import { theme } from "@/lib/theme";
import { GlobalStyle } from "@/styles/GlobalStyle";
import { FilterContextProvider } from "@/context/filter_context";
import { CartProvider } from "@/context/cart_context";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <FilterContextProvider>
        <CartProvider>{children}</CartProvider>
      </FilterContextProvider>
    </ThemeProvider>
  );
}
