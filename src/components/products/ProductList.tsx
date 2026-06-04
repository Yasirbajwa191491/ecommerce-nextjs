"use client";

import styled from "styled-components";
import { useFilterContext } from "@/context/filter_context";
import ProductCard from "./ProductCard";

export default function ProductList() {
  const { filter_products, grid_view } = useFilterContext();
  return (
    <Grid $list={!grid_view}>
      {filter_products.map((p) => <ProductCard key={p._id} {...p} />)}
    </Grid>
  );
}

const Grid = styled.div<{ $list: boolean }>`
  display: grid;
  gap: 2rem;
  grid-template-columns: ${({ $list }) => ($list ? "1fr" : "repeat(3, 1fr)")};
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;
