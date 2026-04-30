import Link from 'next/link';
import { ArrowRight, Camera, ReceiptText } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#171717]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-5 sm:px-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-base font-semibold tracking-normal">
            SplitSnap
          </Link>
          <Link
            href="/about"
            className="rounded-full border border-[#d8d8ce] px-4 py-2 text-sm font-medium text-[#4b4b43] transition-colors hover:border-[#171717] hover:text-[#171717]"
          >
            About
          </Link>
        </nav>

        <section className="grid flex-1 items-center gap-10 py-10 md:grid-cols-[1fr_0.9fr] md:py-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-[#4b4b43] shadow-sm ring-1 ring-[#e3e3d8]">
              <ReceiptText className="h-4 w-4 text-[#0f766e]" />
              Scan. Select. Pay.
            </div>

            <h1 className="max-w-2xl text-5xl font-semibold leading-[0.95] tracking-normal text-[#151511] sm:text-6xl md:text-7xl">
              Split dinner without the group chat math.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-7 text-[#5d5d53]">
              Upload a receipt, review the items, and share one link so everyone pays their exact part.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/create"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#171717] px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-[#30302b]"
              >
                <Camera className="h-5 w-5" />
                Scan bill
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center rounded-lg border border-[#d8d8ce] bg-white px-6 py-4 text-base font-semibold text-[#33332e] transition-colors hover:border-[#171717]"
              >
                How it works
              </Link>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm md:max-w-md">
            <div className="rounded-[2rem] bg-[#171717] p-3 shadow-2xl">
              <div className="rounded-[1.45rem] bg-white p-5">
                <div className="mb-5 flex items-start justify-between gap-4 border-b border-dashed border-[#d8d8ce] pb-4">
                  <div>
                    <p className="text-sm font-semibold text-[#171717]">Demo Restaurant</p>
                    <p className="mt-1 text-xs text-[#77776c]">4 people · CHF 184.60</p>
                  </div>
                  <div className="rounded-full bg-[#e6f3ee] px-3 py-1 text-xs font-semibold text-[#0f766e]">
                    Live
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    ['Margherita Pizza', '18.50'],
                    ['Coca Cola', '5.00'],
                    ['House Wine', '35.00'],
                    ['Caesar Salad', '12.00'],
                  ].map(([name, price]) => (
                    <div key={name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-[#33332e]">{name}</span>
                      <span className="font-medium text-[#171717]">CHF {price}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl bg-[#f7f7f2] p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#5d5d53]">Your share</span>
                    <span className="text-xl font-semibold text-[#171717]">CHF 42.30</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-[#d8d8ce]">
                    <div className="h-2 w-2/3 rounded-full bg-[#0f766e]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
