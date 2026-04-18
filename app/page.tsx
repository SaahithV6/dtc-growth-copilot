import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-400">
          Hackathon MVP
        </p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">
          DTC Growth Copilot
        </h1>
        <p className="mt-4 text-base text-zinc-300 sm:text-lg">
          Paste a Shopify/store URL, pick a niche, and get trend-driven campaign
          strategy, brand review, and ad drafts in minutes.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <Link
          href="/sign-in"
          className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"
        >
          Sign in to start
        </Link>

        <Link
          href="/dashboard"
          className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-100"
        >
          Go to dashboard
        </Link>

        <a
          href="https://vercel.com/new"
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-100"
        >
          Deploy on Vercel
        </a>
      </div>

      <div className="grid w-full gap-6 sm:grid-cols-3">
        {["Trends & competitors", "Brand twin review", "Ad campaign drafts"].map(
          (item) => (
            <div
              key={item}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-left"
            >
              <h3 className="text-base font-semibold">{item}</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Minimal orchestration with real integrations you can wire up
                fast.
              </p>
            </div>
          )
        )}
      </div>
    </main>
  );
}
