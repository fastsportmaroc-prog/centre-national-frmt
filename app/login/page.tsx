import { redirect } from "next/navigation";

/** Alias /login → page auth existante */
export default function LoginAliasPage() {
  redirect("/auth/login");
}
