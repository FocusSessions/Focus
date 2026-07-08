import type { AuthError } from "@supabase/supabase-js";

// Map Supabase error codes to user-friendly messages
export function friendlyAuthError(error: AuthError): string {
  if (!error || !error.message || error.message === "{}") {
    return "An unexpected error occurred or credentials are invalid.";
  }
  const msg = error.message.toLowerCase();
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) 
    return "Incorrect email or password.";
  if (msg.includes("email not confirmed"))
    return "Please check your email to confirm your account.";
  if (msg.includes("already registered"))
    return "An account with this email already exists.";
  if (msg.includes("password")) return "Password must be at least 6 characters.";
  if (msg.includes("rate limit"))
    return "Too many attempts. Please wait a moment.";
  return error.message;
}
