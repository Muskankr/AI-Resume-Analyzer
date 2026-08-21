import React from 'react';
import Link from 'next/link';
import { HeroInteractiveClientWrapper } from '@/components/HeroInteractiveClientWrapper'; // Example client component boundary

// Setting cache behavior for Static Generation (SSG) or ISR
export const revalidate = 3600; // Revalidate every hour, or remove for static SSG export

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Pre-rendered Static Content for SEO & Fast Initial Load */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center space-y-6">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white">
          Supercharge Your Career with <span className="text-teal-400">AI-Resume-Analyzer</span>
        </h1>
        <p className="max-w-2xl mx-auto text-slate-400 text-lg">
          Optimize your resume, get instant ATS score ratings, and match your skills to top industry job descriptions effortlessly.
        </p>

        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl transition-colors shadow-lg"
          >
            Get Started Free
          </Link>
          <Link
            href="/faq"
            className="px-6 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl transition-colors"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Interactive elements (e.g. live counters, upload previews) isolated inside a Client Boundary */}
      <HeroInteractiveClientWrapper />
    </main>
  );
}
