/**
 * Turns any error into a plain sentence and one action, so no screen shows a Supabase message, a
 * code name or a stack text. It checks a known message text first, then the code, then the HTTP
 * status. Messages that Habi writes itself (a plain Error, an Edge Function's `error` text, or a
 * database message that is already a sentence) stay as they are.
 */

export type ErrorAction = "retry" | "signIn" | null;

export type FriendlyError = {
  text: string;
  action: ErrorAction;
  /** The code, for the admin's code line and for a bug report. Never shown to other accounts. */
  code?: string;
};

/** A screen's own words for a code, such as a duplicate name. */
export type ErrorMessages = Partial<Record<string, string>>;

export const MESSAGES = {
  offline: "I cannot reach Habi. Check your connection, then try again.",
  slow: "Habi took too long to answer. Try again.",
  session: "Your session ended.",
  notYours: "Your account cannot change this.",
  gone: "I could not find this. It may be deleted on another device.",
  duplicate: "This already exists. Change the name or the date, then save again.",
  inUse: "Other items still use this. Remove them first, then delete it.",
  linkGone: "The item this links to was deleted. Pick another one.",
  required: "Fill in each required field, then save again.",
  tooLong: "One of the texts is too long. Make it shorter.",
  invalid: "One of the values is not valid. Check the form, then save again.",
  tooMany: "Too many tries in a short time. Wait a minute, then try again.",
  busy: "Habi's server is busy. Try again in a minute.",
  fileTooLarge: "This file is too large. The limit is 5 MB.",
  photoType: "Habi does not take this file type. Use a JPG, PNG or WebP photo.",
  voiceType: "Habi could not save this recording. Record it again.",
  channels: "You follow the most channels I allow. Remove one first.",
  unknown: "Something went wrong on my side. Try again. If it happens again, send a bug report from More.",
  // Sign-in
  badCode: "That code did not work. Check the newest email, or send a new code.",
  noAccount: "I could not send a code to this email. Ask the admin if you need an account.",
  badEmail: "Check the email address, then try again.",
  tooManyCodes: "I sent many codes already. Wait a few minutes, then ask for a new one.",
  accountOff: "This account is turned off. Ask the admin.",
  googleUnfinished: "Google sign-in did not finish. Try again, or use an email code.",
} as const;

type Shape = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
  __isAuthError?: unknown;
  __isStorageError?: unknown;
};

const RETRY: ReadonlySet<string> = new Set([MESSAGES.offline, MESSAGES.slow, MESSAGES.busy, MESSAGES.unknown]);

function result(text: string, code?: string): FriendlyError {
  const action: ErrorAction = text === MESSAGES.session ? "signIn" : RETRY.has(text) ? "retry" : null;
  return { text, action, code };
}

const AUTH_CODES: Record<string, string> = {
  otp_expired: MESSAGES.badCode,
  invalid_credentials: MESSAGES.badCode,
  signup_disabled: MESSAGES.noAccount,
  otp_disabled: MESSAGES.noAccount,
  user_not_found: MESSAGES.noAccount,
  email_address_not_authorized: MESSAGES.noAccount,
  email_address_invalid: MESSAGES.badEmail,
  validation_failed: MESSAGES.badEmail,
  over_email_send_rate_limit: MESSAGES.tooManyCodes,
  over_request_rate_limit: MESSAGES.tooMany,
  user_banned: MESSAGES.accountOff,
  bad_oauth_state: MESSAGES.googleUnfinished,
  bad_oauth_callback: MESSAGES.googleUnfinished,
  provider_disabled: MESSAGES.googleUnfinished,
  flow_state_expired: MESSAGES.googleUnfinished,
  flow_state_not_found: MESSAGES.googleUnfinished,
  bad_code_verifier: MESSAGES.googleUnfinished,
  bad_jwt: MESSAGES.session,
  session_not_found: MESSAGES.session,
  session_expired: MESSAGES.session,
  refresh_token_not_found: MESSAGES.session,
  refresh_token_already_used: MESSAGES.session,
  not_admin: MESSAGES.notYours,
  request_timeout: MESSAGES.slow,
};

/** Postgres and PostgREST codes. */
const DB_CODES: Record<string, string> = {
  PGRST301: MESSAGES.session,
  PGRST303: MESSAGES.session,
  "42501": MESSAGES.notYours,
  PGRST116: MESSAGES.gone,
  P0002: MESSAGES.gone,
  "23505": MESSAGES.duplicate,
  "23502": MESSAGES.required,
  "22001": MESSAGES.tooLong,
  "23514": MESSAGES.invalid,
  "22P02": MESSAGES.invalid,
  "22003": MESSAGES.invalid,
  "22007": MESSAGES.invalid,
  "22008": MESSAGES.invalid,
  "57014": MESSAGES.slow,
  PGRST000: MESSAGES.busy,
  PGRST001: MESSAGES.busy,
  PGRST002: MESSAGES.busy,
  PGRST003: MESSAGES.busy,
  "53300": MESSAGES.busy,
  "57P01": MESSAGES.busy,
};

function fromStatus(status: number): string | null {
  if (status === 401) return MESSAGES.session;
  if (status === 403) return MESSAGES.notYours;
  if (status === 404) return MESSAGES.gone;
  if (status === 408) return MESSAGES.slow;
  if (status === 413) return MESSAGES.fileTooLarge;
  if (status === 415) return MESSAGES.photoType;
  if (status === 429) return MESSAGES.tooMany;
  if (status >= 500 && status <= 504) return MESSAGES.busy;
  return null;
}

/** A database message that Habi wrote as a sentence for people, such as "Tick the items you bought first." */
function isSentence(message: string): boolean {
  return /^[A-Z][^%]*[.!?]$/.test(message.trim()) && !/\b(violates|constraint|relation|column|syntax)\b/.test(message);
}

/** Known message texts. They win over the code, so "not signed in" with 42501 is a session that ended. */
function fromMessage(message: string): string | null {
  const m = message.toLowerCase();
  if (/network request failed|failed to fetch|load failed|networkerror|fetch failed/.test(m)) return MESSAGES.offline;
  if (/aborted|timed? ?out|timeout/.test(m)) return MESSAGES.slow;
  if (m.includes("not signed in") || m.includes("jwt expired")) return MESSAGES.session;
  if (m.includes("does not belong to this user")) return MESSAGES.notYours;
  if (/\bnot found\b/.test(m) && !m.includes("schema cache")) return MESSAGES.gone;
  if (m.trim() === "channel_limit") return MESSAGES.channels;
  if (m.includes("payload too large") || m.includes("exceeded the maximum allowed size")) return MESSAGES.fileTooLarge;
  if (m.includes("mime type") && m.includes("audio")) return MESSAGES.voiceType;
  if (m.includes("mime type")) return MESSAGES.photoType;
  if (m.includes("signups not allowed")) return MESSAGES.noAccount;
  if (m.includes("token has expired or is invalid")) return MESSAGES.badCode;
  if (m.includes("update or delete on table")) return MESSAGES.inUse;
  if (m.includes("insert or update on table")) return MESSAGES.linkGone;
  return null;
}

/** The plain sentence, the action and the code for any error. */
export function friendlyError(error: unknown, messages: ErrorMessages = {}): FriendlyError {
  if (error === null || error === undefined) return result(MESSAGES.unknown);
  if (typeof error === "string") return result(fromMessage(error) ?? (isSentence(error) ? error : MESSAGES.unknown));

  const e = error as Shape;
  const message = typeof e.message === "string" ? e.message : "";
  const name = typeof e.name === "string" ? e.name : "";
  const code = typeof e.code === "string" && e.code ? e.code : undefined;
  const status = typeof e.status === "number" ? e.status : Number(e.statusCode) || undefined;
  const label = code ?? (status ? String(status) : undefined);

  if (code && messages[code]) return result(messages[code]!, code);

  if (name === "FunctionsFetchError" || name === "AuthRetryableFetchError") return result(MESSAGES.offline, label);
  if (name === "FunctionsRelayError") return result(MESSAGES.busy, label);
  if (name === "AbortError") return result(MESSAGES.slow, label);

  const known = fromMessage(message);
  if (known) return result(known, label);

  if (code && e.__isAuthError && AUTH_CODES[code]) return result(AUTH_CODES[code], code);
  if (code && AUTH_CODES[code]) return result(AUTH_CODES[code], code);
  if (code && DB_CODES[code]) return result(DB_CODES[code], code);
  // Habi's own database exceptions (P0001) that are already sentences stay.
  if (code === "P0001" && isSentence(message)) return result(message, code);
  // PGRST204 and PGRST205 (a column or a table the server does not know) are deploy faults.
  if (code?.startsWith("PGRST20")) return result(MESSAGES.unknown, code);

  if (status) {
    const byStatus = fromStatus(status);
    if (byStatus) return result(byStatus, label);
  }

  // A plain Error that Habi threw, or an Edge Function's own `error` text, is already written for people.
  if (!code && !status && !e.__isAuthError && !e.__isStorageError && name === "Error" && isSentence(message)) {
    return result(message);
  }
  return result(MESSAGES.unknown, label);
}

/** The sentence only, for a place that shows one line, such as a snackbar or a field. */
export function errorText(error: unknown, messages?: ErrorMessages): string {
  return friendlyError(error, messages).text;
}
