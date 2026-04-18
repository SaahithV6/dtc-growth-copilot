import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Run a new campaign</h1>
        <p className="text-sm text-zinc-400">
          Drop your store URL and niche. The copilot will orchestrate the
          workflow and return a launch-ready plan.
        </p>
      </header>

      <form
        className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6"
        action="/api/run"
        method="post"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="url">
            Store URL
          </label>
          <input
            id="url"
            name="url"
            type="url"
            required
            placeholder="https://yourstore.com"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-500"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-200" htmlFor="niche">
            Niche
          </label>
          <input
            id="niche"
            name="niche"
            type="text"
            required
            placeholder="Supplements, streetwear, skincare..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-500"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black"
        >
          Run Campaign
        </button>
      </form>
    </main>
  );
}
