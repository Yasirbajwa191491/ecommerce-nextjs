"use client";

import styled from "styled-components";
import FilterSection from "@/components/products/FilterSection";
import ProductList from "@/components/products/ProductList";
import Sort from "@/components/products/Sort";
import { useProducts } from "@/hooks/useProducts";

export default function ProductsPage() {
  const { isLoading } = useProducts();
  if (isLoading) return <div className="page_loading">Loading products from Convex...</div>;
  return (
    <Wrap className="container grid grid-filter-column">
      <FilterSection />
      <section>
        <Sort />
        <ProductList />
      </section>
    </Wrap>
  );
}

const Wrap = styled.section`padding: 6rem 0;`;
