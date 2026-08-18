import { Product } from "@/types/product";

export type FilterState = {
  filter_products: Product[];
  all_products: Product[];
  grid_view: boolean;
  sorting_value: string;
  filters: {
    text: string;
    category: string;
    company: string;
    color: string;
    maxPrice: number;
    price: number;
    minPrice: number;
  };
};

type FilterAction =
  | { type: "LOAD_FILTER_PRODUCTS"; payload: Product[] }
  | { type: "SET_GRID_VIEW" }
  | { type: "SET_LIST_VIEW" }
  | { type: "GET_SORT_VALUE"; payload: string }
  | { type: "UPDATE_FILTERS_VALUE"; payload: { name: string; value: string } }
  | { type: "CLEAR_FILTERS" };

export const filterInitialState: FilterState = {
  filter_products: [],
  all_products: [],
  grid_view: true,
  sorting_value: "lowest",
  filters: {
    text: "",
    category: "all",
    company: "all",
    color: "all",
    maxPrice: 0,
    price: 0,
    minPrice: 0,
  },
};

function filterByCriteria(
  all_products: Product[],
  filters: FilterState["filters"]
): Product[] {
  let temp = [...all_products];
  const { text, category, company, color, price } = filters;

  if (text) {
    temp = temp.filter((p) =>
      p.name.toLowerCase().includes(text.toLowerCase())
    );
  }
  if (category !== "all") {
    temp = temp.filter((p) => p.category?.slug === category);
  }
  if (company !== "all") {
    temp = temp.filter((p) => p.company === company);
  }
  if (color !== "all") {
    temp = temp.filter((p) => p.colors.includes(color));
  }
  return temp.filter((p) => p.price <= price);
}

function sortProducts(
  products: Product[],
  sorting_value: string
): Product[] {
  const sorted = [...products];
  sorted.sort((a, b) => {
    if (sorting_value === "lowest") return a.price - b.price;
    if (sorting_value === "highest") return b.price - a.price;
    if (sorting_value === "a-z") return a.name.localeCompare(b.name);
    if (sorting_value === "z-a") return b.name.localeCompare(a.name);
    return 0;
  });
  return sorted;
}

function withFilteredAndSorted(state: FilterState): FilterState {
  const filtered = filterByCriteria(state.all_products, state.filters);
  return {
    ...state,
    filter_products: sortProducts(filtered, state.sorting_value),
  };
}

export function filterReducer(
  state: FilterState,
  action: FilterAction
): FilterState {
  switch (action.type) {
    case "LOAD_FILTER_PRODUCTS": {
      const maxPrice = action.payload.length
        ? Math.max(...action.payload.map((p) => p.price))
        : 0;
      return withFilteredAndSorted({
        ...state,
        all_products: [...action.payload],
        filters: { ...state.filters, maxPrice, price: maxPrice },
      });
    }
    case "SET_GRID_VIEW":
      return { ...state, grid_view: true };
    case "SET_LIST_VIEW":
      return { ...state, grid_view: false };
    case "GET_SORT_VALUE":
      return withFilteredAndSorted({
        ...state,
        sorting_value: action.payload,
      });
    case "UPDATE_FILTERS_VALUE": {
      const { name, value } = action.payload;
      return withFilteredAndSorted({
        ...state,
        filters: { ...state.filters, [name]: value },
      });
    }
    case "CLEAR_FILTERS":
      return withFilteredAndSorted({
        ...state,
        filters: {
          ...state.filters,
          text: "",
          category: "all",
          company: "all",
          color: "all",
          price: state.filters.maxPrice,
        },
      });
    default:
      return state;
  }
}
