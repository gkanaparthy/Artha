import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Trading Psychology Journal',
  description:
    'Track the behavioral cost of FOMO, revenge trading, and rule breaks with an automated trading psychology journal.',
};

export default function TradingPsychologyJournalPage() {
  return (
    <main className="min-h-screen bg-[#FAFBF6] py-16">
      <section className="container mx-auto max-w-4xl px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-[#2E4A3B] mb-4">
          A trading psychology journal that shows what your behavior costs
        </h1>
        <p className="text-lg text-[#2E4A3B]/70 mb-8">
          Most journals stop at P&L. Artha connects your setup tags, emotions, and mistakes to actual dollars so you can
          fix repeatable leaks, not just review charts.
        </p>
        <div className="rounded-2xl overflow-hidden border border-[#2E4A3B]/10 mb-8">
          <Image
            src="/og-image.png"
            alt="Artha trading dashboard preview"
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
