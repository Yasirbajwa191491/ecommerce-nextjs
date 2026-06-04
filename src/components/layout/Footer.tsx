"use client";

import styled from "styled-components";

export default function Footer() {
  return (
    <Wrap>
      <p>© {new Date().getFullYear()} Ecommerce Store — Next.js + Convex realtime</p>
    </Wrap>
  );
}

const Wrap = styled.footer`
  padding: 6rem 4rem;
  background: ${({ theme }) => theme.colors.footer_bg};
  color: ${({ theme }) => theme.colors.white};
  text-align: center;
`;
