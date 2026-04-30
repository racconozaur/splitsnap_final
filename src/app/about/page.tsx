import Link from 'next/link';
import { ArrowLeft, Camera, CreditCard, Edit3, Users } from 'lucide-react';

const steps = [
  {
    icon: Camera,
    title: 'Scan receipt',
    text: 'Gemini reads item names, prices, quantities, tax, service, tip, and total.',
  },
  {
    icon: Edit3,
    title: 'Review bill',
    text: 'The payer fixes OCR mistakes, adds missing items, and chooses payment details.',
  },
  {
    icon: Users,
    title: 'Friends select',
    text: 'Each person opens the link and claims full or partial shares of the items.',
  },
  {
    icon: CreditCard,
    title: 'Pay back',
    text: 'The app calculates proportional extras and shows payment QR or app links.',
  },
];

const features = [
  'Editable receipt items',
  'Shared item percentages',
  'Proportional tax and tip',
  'No login required',
  'Payer dashboard',
  'Paid/unpaid status',
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#171717]">
      <div className="mx-auto w-full max-w-4xl px-5 py-5 sm:px-8">
        <nav className="mb-10 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#4b4b43]">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <Link
            href="/create"
            className="rounded-lg bg-[#171717] px-4 py-2 text-sm font-semibold text-white"
          >
            Scan bill
          </Link>
        </nav>

        <section className="mb-10">
          <p className="text-sm font-semibold uppercase text-[#0f766e]">How SplitSnap works</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
            From receipt photo to fair payment link.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-7 text-[#5d5d53]">
            The goal is simple: one person pays, everyone else selects what they had, and the app calculates the fair amount.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="rounded-xl border border-[#e3e3d8] bg-white p-5">
                <Icon className="mb-4 h-5 w-5 text-[#0f766e]" />
                <h2 className="text-lg font-semibold">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#5d5d53]">{step.text}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-10 rounded-xl bg-[#171717] p-5 text-white">
          <h2 className="text-xl font-semibold">MVP features</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="rounded-lg bg-white/10 px-4 py-3 text-sm font-medium">
                {feature}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
//made with Bob
