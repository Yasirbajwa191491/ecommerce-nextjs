"use client";

import styled from "styled-components";
import { useFilterContext } from "@/context/filter_context";

export default function Sort() {
  const { filter_products, sorting, setGridView, setListView } = useFilterContext();
  return (
    <Row>
      <span>{filter_products.length} products</span>
      <button type="button" onClick={setGridView}>Grid</button>
      <button type="button" onClick={setListView}>List</button>
      <select onChange={sorting}>
        <option value="lowest">Lowest</option>
        <option value="highest">Highest</option>
        <option value="a-z">A-Z</option>
        <option value="z-a">Z-A</option>
      </select>
    </Row>
  );
}

const Row = styled.div`display: flex; gap: 1rem; align-items: center; margin-bottom: 2rem; flex-wrap: wrap;`;
