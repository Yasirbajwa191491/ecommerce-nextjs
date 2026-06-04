"use client";

import styled from "styled-components";
import { useFilterContext } from "@/context/filter_context";

export default function FilterSection() {
  const { filters, all_products, updateFilterValue, clearFilters } = useFilterContext();
  const categories = ["all", ...new Set(all_products.map((p) => p.category))];
  return (
    <Aside>
      <input name="text" placeholder="Search" value={filters.text} onChange={updateFilterValue} />
      {categories.map((c) => (
        <label key={c}>
          <input type="radio" name="category" value={c} checked={filters.category === c} onChange={updateFilterValue} />
          {c}
        </label>
      ))}
      <input type="range" name="price" min={0} max={filters.maxPrice} value={filters.price} onChange={updateFilterValue} />
      <button type="button" onClick={clearFilters}>Clear</button>
    </Aside>
  );
}

const Aside = styled.aside`
  display: flex; flex-direction: column; gap: 1rem; padding: 2rem; background: #fff; border-radius: 1rem;
  button { padding: 0.8rem; background: ${({ theme }) => theme.colors.btn}; color: #fff; border: none; cursor: pointer; }
`;
