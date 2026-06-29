import { redirect } from "next/navigation";

// BUG-22: The /session route was a duplicate of the home page timer.
// Redirect to home to avoid a confusing navigation dead end.
export default function SessionPage() {
  redirect("/");
}
