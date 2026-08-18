"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  ReactNode,
} from "react";
import { useProducts } from "@/hooks/useProducts";
import { filterInitialState, filterReducer, FilterState } from "@/reducer/filterReducer";

type Ctx = FilterState & {
  setGridView: () => void;
  setListView: () => void;
  sorting: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  updateFilterValue: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  clearFilters: () => void;
};

const FilterContext = createContext<Ctx | null>(null);

export function FilterContextProvider({ children }: { children: ReactNode }) {
  const { products } = useProducts();
  const [state, dispatch] = useReducer(filterReducer, filterInitialState);

  // Stable key so Convex array identity changes don't retrigger load
  const productsKey = useMemo(
    () => products.map((p) => p._id).join(","),
    [products]
  );

  useEffect(() => {
    if (!products.length) return;
    dispatch({ type: "LOAD_FILTER_PRODUCTS", payload: products });
  }, [productsKey, products]);

  return (
    <FilterContext.Provider
      value={{
        ...state,
        setGridView: () => dispatch({ type: "SET_GRID_VIEW" }),
        setListView: () => dispatch({ type: "SET_LIST_VIEW" }),
        sorting: (e) =>
          dispatch({ type: "GET_SORT_VALUE", payload: e.target.value }),
        updateFilterValue: (e) =>
          dispatch({
            type: "UPDATE_FILTERS_VALUE",
            payload: { name: e.target.name, value: e.target.value },
          }),
        clearFilters: () => dispatch({ type: "CLEAR_FILTERS" }),
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilterContext() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilterContext requires provider");
  return ctx;
}
