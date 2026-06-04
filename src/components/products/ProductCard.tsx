"use client";

import Link from "next/link";
import Image from "next/image";
import styled from "styled-components";
import FormatPrice from "@/helpers/FormatPrice";
import { Product } from "@/types/product";

export default function ProductCard(p: Product) {
  return (
    <Link href={`/singleproduct/${p.externalId}`}>
      <Card>
        <Image src={p.image[0]?.url ?? "/next.svg"} alt={p.name} width={250} height={200} style={{ objectFit: "cover" }} />
        <figcaption className="caption">{p.category}</figcaption>
        <h3>{p.name}</h3>
        <FormatPrice price={p.price} />
      </Card>
    </Link>
  );
}

const Card = styled.div`
  background: #fff;
  border-radius: 1rem;
  padding: 1rem;
  position: relative;
  box-shadow: ${({ theme }) => theme.colors.shadow};
  h3 { margin: 1rem 0; font-size: 1.6rem; }
`;
