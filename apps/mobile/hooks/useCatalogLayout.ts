import { useCallback, useEffect, useState } from "react";

import {
  readCatalogLayout,
  writeCatalogLayout,
  type CatalogLayout,
} from "@/lib/catalog/layout-storage";

export function useCatalogLayout() {
  const [layout, setLayoutState] = useState<CatalogLayout>("grid");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void readCatalogLayout().then((stored) => {
      setLayoutState(stored);
      setReady(true);
    });
  }, []);

  const setLayout = useCallback((next: CatalogLayout) => {
    setLayoutState(next);
    void writeCatalogLayout(next);
  }, []);

  const toggleLayout = useCallback(() => {
    setLayoutState((current) => {
      const next: CatalogLayout = current === "grid" ? "list" : "grid";
      void writeCatalogLayout(next);
      return next;
    });
  }, []);

  return { layout, setLayout, toggleLayout, ready };
}
