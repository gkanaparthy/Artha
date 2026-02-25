import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Behavioral Alpha Trading',
  description:
    'Behavioral Alpha shows the hidden P&L impact of mistakes like FOMO, revenge trading, and breaking your trade plan.',
};

export default function BehavioralAlphaTradingPage() {
  return (
    <main className="min-h-screen bg-[#FAFBF6] py-16">
      <section className="container mx-auto max-w-4xl px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-[#2E4A3B] mb-4">
          Behavioral Alpha: measure your edge beyond win rate
        </h1>
        <p className="text-lg text-[#2E4A3B]/70 mb-8">
          Behavioral Alpha turns trading habits into hard numbers. You can see which mistakes destroy expectancy and which
          routines improve consistency over time.
        </p>
        <div className="rounded-2xl overflow-hidden border border-[#2E4A3B]/10 mb-8">
          <Image
            src="/og-image.png"
            alt="Behavioral Alpha dashboard"
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
