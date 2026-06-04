"use client";

import Image from "next/image";
import styled from "styled-components";
import FormatPrice from "@/helpers/FormatPrice";
import { useCartContext } from "@/context/cart_context";

export default function CartPage() {
  const { cart, total_item, total_price, shipping_fee, setIncrement, setDecrease, removeItem, clearCart } = useCartContext();

  if (!cart.length) return <Wrap className="container"><h2>Cart is empty</h2></Wrap>;

  return (
    <Wrap className="container">
      <h2>Cart ({total_item})</h2>
      {cart.map((item) => (
        <Row key={item.id}>
          <Image src={item.image} alt={item.name} width={80} height={80} />
          <div>
            <h3>{item.name}</h3>
            <FormatPrice price={item.price} />
          </div>
          <div>
            <button type="button" onClick={() => setDecrease(item.id)}>-</button>
            {item.amount}
            <button type="button" onClick={() => setIncrement(item.id)}>+</button>
          </div>
          <button type="button" onClick={() => removeItem(item.id)}>Remove</button>
        </Row>
      ))}
      <p>Total: <FormatPrice price={total_price + shipping_fee} /></p>
      <button type="button" onClick={clearCart}>Clear</button>
    </Wrap>
  );
}

const Wrap = styled.section`padding: 9rem 0;`;
const Row = styled.div`display: grid; grid-template-columns: 80px 1fr auto auto; gap: 2rem; padding: 2rem 0; border-bottom: 1px solid #eee;`;
