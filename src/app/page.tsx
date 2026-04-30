import Link from 'next/link';
import { Camera, Users, CreditCard, QrCode, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <header className="pt-16 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <QrCode className="w-4 h-4" />
            Scan. Select. Pay.
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Split bills <span className="text-blue-600">fairly</span>,
            <br />without the hassle
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Scan your restaurant receipt, share a link with friends, and let everyone
            select what they ordered. Fair splits, instant payments.
          </p>

          <Link
            href="/create"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            <Camera className="w-6 h-6" />
            Scan a Bill
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How it works
          </h2>

          <div className="grid md:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-sm text-blue-600 font-medium mb-2">Step 1</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Scan Receipt</h3>
              <p className="text-gray-600 text-sm">
                Take a photo of your bill. Our AI extracts all items automatically.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="text-sm text-green-600 font-medium mb-2">Step 2</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Edit & Share</h3>
              <p className="text-gray-600 text-sm">
                Fix any OCR mistakes, add tip, and share the link with your group.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <div className="text-sm text-purple-600 font-medium mb-2">Step 3</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Friends Select</h3>
              <p className="text-gray-600 text-sm">
                Everyone picks what they ordered. Shared items? No problem.
              </p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-orange-600" />
              </div>
              <div className="text-sm text-orange-600 font-medium mb-2">Step 4</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pay Instantly</h3>
              <p className="text-gray-600 text-sm">
                Get your exact amount with QR codes for TWINT or Revolut.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Fair splits, every time
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Proportional tax & tip
              </h3>
              <p className="text-gray-600">
                Tax and tips are split based on what you ordered, not equally.
                Order more, pay more of the extras.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Share items easily
              </h3>
              <p className="text-gray-600">
                Split a pizza 4 ways? Shared a bottle of wine? Mark items as
                shared and split them however you want.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No app needed
              </h3>
              <p className="text-gray-600">
                Friends just open a link. No downloads, no signups, no friction.
                Works on any device with a browser.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Real-time dashboard
              </h3>
              <p className="text-gray-600">
                See who has selected their items and paid. Track everything in
                one place until everyone is settled.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Ready to split your bill?
          </h2>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            <Camera className="w-6 h-6" />
            Get Started
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-4xl mx-auto text-center text-gray-500 text-sm">
          <p>SplitSnap - Built for IBM Hackathon 2025</p>
        </div>
      </footer>
    </div>
  );
}
