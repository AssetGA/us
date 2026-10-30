import { redirect } from "next/navigation";

export default function VerifyWhatsAppRemoved() {
  redirect("/verify-email");
}
