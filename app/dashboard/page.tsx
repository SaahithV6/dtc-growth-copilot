import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CampaignForm from "./campaign-form";

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
          Drop your store URL and niche. The copilot will orchestrate TikTok &
          Instagram trend scraping, Shopify product analysis, a Minds AI Brand
          Twin focus group, and campaign export generation for Pixero +
          Instagram — then return a launch-ready plan.
        </p>
      </header>

      <CampaignForm />
    </main>
  );
}
