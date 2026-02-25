import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Automated Trading Journal',
  description:
    'Use an automated trading journal that syncs from 100+ brokers and calculates FIFO P&L, Net R, and Avg R automatically.',
};

export default function AutomatedTradingJournalPage() {
  return (
    <main className="min-h-screen bg-[#FAFBF6] py-16">
      <section className="container mx-auto max-w-4xl px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-[#2E4A3B] mb-4">
          Automated trading journal with zero manual entry
        </h1>
        <p className="text-lg text-[#2E4A3B]/70 mb-8">
          Artha auto-syncs trades from 100+ brokers, calculates FIFO P&amp;L, and tracks R-multiples. You spend less time
          logging and more time improving execution.
        </p>
        <div className="rounded-2xl overflow-hidden border border-[#2E4A3B]/10 mb-8">
          <Image
            src="/og-image.png"
            alt="Automated trade journal dashboard"
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
