import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Revenge Trading Cost Calculator',
  description:
    'Estimate and track the cost of revenge trading using your real trade history, tagged mistakes, and behavioral analytics.',
};

export default function RevengeTradingCostCalculatorPage() {
  return (
    <main className="min-h-screen bg-[#FAFBF6] py-16">
      <section className="container mx-auto max-w-4xl px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-[#2E4A3B] mb-4">
          Revenge trading cost calculator for real accounts
        </h1>
        <p className="text-lg text-[#2E4A3B]/70 mb-8">
          Tag revenge trades and see their exact P&amp;L impact over time. Artha helps you quantify the leak and replace
          impulse with process-driven rules.
        </p>
        <div className="rounded-2xl overflow-hidden border border-[#2E4A3B]/10 mb-8">
          <Image
            src="/og-image.png"
            alt="Trading behavior analytics screenshot"
            width={1200}
            height={630}
            className="w-full h-auto"
          />
        </div>
        <Link href="/login">
          <Button className="bg-[#2E4A3B] hover:bg-[#2E4A3B]/90 text-white rounded-full px-8">
            Connect Your Broker Free
          </Button>
        </Link>
      </section>
    </main>
  );
}
