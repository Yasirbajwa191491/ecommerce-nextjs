import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-muted/40 via-background to-background">
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8 sm:py-14">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-4 text-muted-foreground">
          We collect the information you provide at checkout — including your name,
          email, phone number, and shipping address — to process and deliver your
          order. Payment details for card transactions are handled securely by
          Stripe and are not stored on our servers.
        </p>
        <p className="mt-4 text-muted-foreground">
          Your information may be saved to speed up future purchases. We do not sell
          your personal data. You may contact us to request updates or deletion of
          your saved details.
        </p>
        <Button render={<Link href="/checkout" />} variant="outline" className="mt-8">
          Back to checkout
        </Button>
      </section>
    </div>
  );
}
