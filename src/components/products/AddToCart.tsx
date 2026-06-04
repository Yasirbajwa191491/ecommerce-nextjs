"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCartContext } from "@/context/cart_context";
import { Product } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function AddToCart({ product }: { product: Product }) {
  const { addToCart } = useCartContext();
  const [amount, setAmount] = useState(1);
  const [color, setColor] = useState(product.colors[0] ?? "#000");

  const handleAdd = () => {
    addToCart(product._id, color, amount, product);
    toast.success("Added to cart", {
      description: `${amount}× ${product.name}`,
    });
  };

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div>
        <Label className="mb-2 block">Color</Label>
        <div className="flex flex-wrap gap-2">
          {product.colors.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              className={cn(
                "size-8 rounded-full border-2 transition-shadow",
                color === c ? "border-primary ring-2 ring-primary/30" : "border-border"
              )}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Label>Quantity</Label>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setAmount((a) => Math.max(1, a - 1))}
          aria-label="Decrease quantity"
        >
          <Minus className="size-4" />
        </Button>
        <span className="min-w-8 text-center text-lg font-medium">{amount}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setAmount((a) => Math.min(product.stock, a + 1))}
          aria-label="Increase quantity"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <Button type="button" size="lg" onClick={handleAdd}>
        Add to cart
      </Button>
    </div>
  );
}
