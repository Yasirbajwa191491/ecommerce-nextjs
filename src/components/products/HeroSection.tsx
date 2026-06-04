"use client";

import Link from "next/link";
import styled from "styled-components";

export default function HeroSection({ title }: { title: string }) {
  return (
    <Wrap>
      <div className="container">
        <p className="intro-data">Welcome to</p>
        <h1>{title}</h1>
        <p>Live product catalog powered by Convex</p>
        <Link href="/products" className="btn">Shop Now</Link>
      </div>
    </Wrap>
  );
}

const Wrap = styled.section`
  padding: 12rem 0 6rem;
  background: ${({ theme }) => theme.colors.gradient};
  h1, p, .intro-data { color: #fff; }
  .btn { display: inline-block; margin-top: 2rem; padding: 1.2rem 2rem; background: ${({ theme }) => theme.colors.btn}; color: #fff; }
`;
