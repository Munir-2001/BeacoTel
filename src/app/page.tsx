import { redirect } from "next/navigation";
import { getLandingPath } from "@/lib/auth/dal";

export default async function Home() {
  // Role-aware entry point — sends each user to the first page they can open.
  redirect(await getLandingPath());
}
