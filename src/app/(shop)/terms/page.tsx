import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-muted/40 via-background to-background">
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8 sm:py-14">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Terms & Conditions
        </h1>
        <p className="mt-4 text-muted-foreground">
          By placing an order on our store, you agree to purchase items subject to
          availability, accurate delivery details, and our standard return policy.
          Cash on delivery orders must be paid in full upon receipt. Card payments
          are processed securely through Stripe.
        </p>
        <p className="mt-4 text-muted-foreground">
          We reserve the right to cancel orders in cases of pricing errors,
          suspected fraud, or inventory issues. For questions, please contact our
          support team.
        </p>
        <Button render={<Link href="/checkout" />} variant="outline" className="mt-8">
          Back to checkout
        </Button>
      </section>
    </div>
  );
}
