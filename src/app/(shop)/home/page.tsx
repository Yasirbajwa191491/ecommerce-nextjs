"use client";

import Link from "next/link";
import HeroSection from "@/components/products/HeroSection";
import FeatureProduct from "@/components/products/FeatureProduct";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <>
      <HeroSection title="Ecommerce Store" />
      <FeatureProduct />
      <div className="flex justify-center py-16">
        <Link href="/products">
          <Button size="lg">Get Started</Button>
        </Link>
      </div>
    </>
  );
}
