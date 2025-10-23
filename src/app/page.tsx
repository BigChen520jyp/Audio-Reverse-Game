"use client";

import Recorder from "@/components/Recorder";

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-120px)] w-full bg-white text-black">
      <section className="max-w-3xl mx-auto px-6">
        <div className="py-16 text-center">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">Record. <span className="text-accent">Reverse</span>. Replicate.</h1>
          <p className="mt-3 text-sm sm:text-base text-black/60">Record a speech, listen to it in reverse, try to pronounce it, and see how well you did</p>
        </div>

        <div className="rounded-2xl border border-black/10 p-8 shadow-sm">
          <Recorder />
        </div>
      </section>
    </main>
  );
}
