"use client";

import styled from "styled-components";
import { useProducts } from "@/hooks/useProducts";
import ProductCard from "./ProductCard";

export default function FeatureProduct() {
  const { featureProducts, isLoading } = useProducts();
  if (isLoading) return <div className="page_loading">Loading...</div>;
  return (
    <Wrap className="container">
      <p className="intro-data">Check Now!</p>
      <h2 className="common-heading">Our Feature Services</h2>
      <div className="grid grid-three-column">
        {featureProducts.map((p) => <ProductCard key={p._id} {...p} />)}
      </div>
    </Wrap>
  );
}

const Wrap = styled.section`padding: 9rem 0; background: ${({ theme }) => theme.colors.bg};`;
