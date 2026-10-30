import { redirect } from "next/navigation";

export default async function VerifyTelegramRedirect({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; bot?: string }>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.email) q.set("email", sp.email);
  if (sp.bot) q.set("bot", sp.bot);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  redirect(`/verify-email${suffix}`);
}
