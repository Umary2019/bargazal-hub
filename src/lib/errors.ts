import { toast } from "sonner";

/** Turn a raw database/network error into language a business owner understands. */
export function friendlyError(error: unknown): string {
  const raw = extractMessage(error);
  const code = extractCode(error);

  switch (code) {
    case "23505":
      return "That record already exists. Please use a different value and try again.";
    case "23503":
      return "This record is linked to other records and cannot be changed or removed yet.";
    case "23514":
      return "Some of the values entered are not valid. Please review the amounts and try again.";
    case "42501":
    case "PGRST301":
      return "You do not have permission to perform this action. Please sign in again.";
    case "PGRST116":
      return "That record could not be found. It may have been removed.";
    default:
      break;
  }

  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return "Cannot reach the server. Please check your internet connection and try again.";
  }
  if (/invalid login credentials/i.test(raw)) {
    return "Incorrect email or password.";
  }
  if (/email not confirmed/i.test(raw)) {
    return "Please confirm your email address before signing in.";
  }
  if (/user already registered/i.test(raw)) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (/violates row-level security/i.test(raw)) {
    return "You do not have permission to perform this action.";
  }
  if (/jwt|session/i.test(raw)) {
    return "Your session has expired. Please sign in again.";
  }

  return raw && raw.length < 140 ? raw : "Something went wrong. Please try again.";
}

export function notifyError(error: unknown, fallback?: string): void {
  console.error(error);
  toast.error(fallback ?? "Action failed", { description: friendlyError(error) });
}

function extractMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return "";
}

function extractCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: unknown }).code;
    return code == null ? undefined : String(code);
  }
  return undefined;
}
