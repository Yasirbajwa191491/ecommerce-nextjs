"use client";

import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
/* Do not zero padding/margin on * — it overrides Tailwind utilities (unlayered beats @layer). */
*, *::before, *::after {
  box-sizing: border-box;
  font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
}
html { font-size: 100%; overflow-x: hidden; }
body { margin: 0; overflow-x: hidden; }
a { text-decoration: none; }
li { list-style: none; }
.container { max-width: 120rem; margin: 0 auto; }
.grid-two-column { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9rem; }
.grid-three-column { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9rem; }
.grid-filter-column { display: grid; grid-template-columns: 0.2fr 1fr; gap: 9rem; }
.common-heading { font-size: 3.8rem; font-weight: 600; margin-bottom: 6rem; text-transform: capitalize; }
.intro-data { text-transform: uppercase; color: #5138ee; }
.caption { position: absolute; top: 15%; right: 10%; text-transform: uppercase; background: ${({ theme }) => theme.colors.bg}; color: ${({ theme }) => theme.colors.helper}; padding: 0.8rem 2rem; font-size: 1.2rem; border-radius: 2rem; }
.page_loading { font-size: 3.2rem; display: flex; justify-content: center; padding: 6rem; }
@media (max-width: ${({ theme }) => theme.media.mobile}) {
  .grid-two-column, .grid-three-column, .grid-filter-column { grid-template-columns: 1fr; }
}
`;
