"use client";

import styled from "styled-components";
import { useFilterContext } from "@/context/filter_context";
import { useActiveCategories } from "@/hooks/useProducts";
import type { ProductCategory } from "@/types/product";

export default function FilterSection() {
  const { filters, updateFilterValue, clearFilters } = useFilterContext();
  const { categories } = useActiveCategories();

  return (
    <Aside>
      <input
        name="text"
        placeholder="Search"
        value={filters.text}
        onChange={updateFilterValue}
      />
      <label>
        <input
          type="radio"
          name="category"
          value="all"
          checked={filters.category === "all"}
          onChange={updateFilterValue}
        />
        all
      </label>
      {categories.map((c: ProductCategory) => (
        <label key={c._id}>
          <input
            type="radio"
            name="category"
            value={c.slug}
            checked={filters.category === c.slug}
            onChange={updateFilterValue}
          />
          {c.name}
        </label>
      ))}
      <input
        type="range"
        name="price"
        min={0}
        max={filters.maxPrice}
        value={filters.price}
        onChange={updateFilterValue}
      />
      <button type="button" onClick={clearFilters}>
        Clear
      </button>
    </Aside>
  );
}

const Aside = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
  background: #fff;
  border-radius: 1rem;
  button {
    padding: 0.8rem;
    background: ${({ theme }) => theme.colors.btn};
    color: #fff;
    border: none;
    cursor: pointer;
  }
`;
