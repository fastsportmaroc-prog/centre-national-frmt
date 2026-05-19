import { redirect } from "next/navigation";

/** Ancienne route : terrains fusionnés avec infrastructures */
export default function CourtsPage() {
  redirect("/infrastructures");
}
