"use client";

import Image from "next/image";
import { use } from "react";
import styled from "styled-components";
import FormatPrice from "@/helpers/FormatPrice";
import { useSingleProduct } from "@/hooks/useProducts";
import AddToCart from "@/components/products/AddToCart";

export default function SingleProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { singleProduct, isSingleLoading } = useSingleProduct(id);

  if (isSingleLoading) return <div className="page_loading">Loading...</div>;
  if (!singleProduct) return <div className="page_loading">Not found</div>;

  return (
    <Wrap className="container grid grid-two-column">
      <Image src={singleProduct.image[0]?.url ?? "/next.svg"} alt={singleProduct.name} width={500} height={400} style={{ objectFit: "cover" }} />
      <div>
        <h2>{singleProduct.name}</h2>
        <FormatPrice price={singleProduct.price} />
        <p>{singleProduct.description}</p>
        <p>Stock: {singleProduct.stock}</p>
        {singleProduct.stock > 0 && <AddToCart product={singleProduct} />}
      </div>
    </Wrap>
  );
}

const Wrap = styled.section`padding: 9rem 0; gap: 4rem;`;
