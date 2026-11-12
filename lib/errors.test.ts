import { describe, expect, it } from "vitest";

import { friendlyError, MESSAGES } from "@/lib/errors";

const db = (code: string, message = "x") => ({ name: "PostgrestError", code, message, details: "", hint: "" });
const auth = (code: string, status = 400) => ({
  name: "AuthApiError",
  __isAuthError: true,
  code,
  status,
  message: code,
});

describe("friendlyError", () => {
  it.each([
    [new TypeError("Network request failed"), MESSAGES.offline, "retry"],
    [new TypeError("Failed to fetch"), MESSAGES.offline, "retry"],
    [{ name: "FunctionsFetchError", message: "Failed to send a request" }, MESSAGES.offline, "retry"],
    [{ name: "AuthRetryableFetchError", __isAuthError: true, message: "{}", status: 0 }, MESSAGES.offline, "retry"],
    [db("57014", "canceling statement due to statement timeout"), MESSAGES.slow, "retry"],
    [db("PGRST303", "JWT expired"), MESSAGES.session, "signIn"],
    [db("PGRST301"), MESSAGES.session, "signIn"],
    [auth("session_not_found", 403), MESSAGES.session, "signIn"],
    [db("42501", "new row violates row-level security policy"), MESSAGES.notYours, null],
    [db("PGRST116", "JSON object requested, multiple (or no) rows returned"), MESSAGES.gone, null],
    [db("P0002", "debt 12 not found"), MESSAGES.gone, null],
    [
      db("23505", 'duplicate key value violates unique constraint "money_accounts_user_id_name_key"'),
      MESSAGES.duplicate,
      null,
    ],
    [db("23503", 'update or delete on table "money_accounts" violates foreign key constraint'), MESSAGES.inUse, null],
    [db("23503", 'insert or update on table "transactions" violates foreign key constraint'), MESSAGES.linkGone, null],
    [db("23502", 'null value in column "name" violates not-null constraint'), MESSAGES.required, null],
    [db("22001", "value too long for type character varying(80)"), MESSAGES.tooLong, null],
    [db("23514", 'new row violates check constraint "amount_positive"'), MESSAGES.invalid, null],
    [db("22P02", 'invalid input syntax for type uuid: "x"'), MESSAGES.invalid, null],
    [{ status: 429, message: "Too Many Requests" }, MESSAGES.tooMany, null],
    [db("PGRST002", "Could not query the database for the schema cache"), MESSAGES.busy, "retry"],
    [{ name: "FunctionsRelayError", message: "Relay Error invoking the Edge Function" }, MESSAGES.busy, "retry"],
    [
      { __isStorageError: true, name: "StorageApiError", status: 413, message: "Payload too large" },
      MESSAGES.fileTooLarge,
      null,
    ],
    [
      { __isStorageError: true, name: "StorageApiError", status: 400, message: "mime type image/gif is not supported" },
      MESSAGES.photoType,
      null,
    ],
    [
      { __isStorageError: true, name: "StorageApiError", status: 400, message: "mime type audio/ogg is not supported" },
      MESSAGES.voiceType,
      null,
    ],
    [db("PGRST205", "Could not find the table 'public.x' in the schema cache"), MESSAGES.unknown, "retry"],
    [db("PGRST204", "Could not find the 'y' column of 'x' in the schema cache"), MESSAGES.unknown, "retry"],
    [db("XX000", "internal error"), MESSAGES.unknown, "retry"],
  ])("maps %o", (error, text, action) => {
    expect(friendlyError(error)).toMatchObject({ text, action });
  });

  it("checks the message before the code", () => {
    expect(friendlyError(db("42501", "not signed in")).text).toBe(MESSAGES.session);
  });

  it("maps sign-in codes", () => {
    expect(friendlyError(auth("otp_expired", 403)).text).toBe(MESSAGES.badCode);
    expect(friendlyError(auth("signup_disabled", 422)).text).toBe(MESSAGES.noAccount);
    expect(friendlyError(auth("over_email_send_rate_limit", 429)).text).toBe(MESSAGES.tooManyCodes);
    expect(friendlyError(auth("user_banned")).text).toBe(MESSAGES.accountOff);
    expect(friendlyError(auth("bad_oauth_callback")).text).toBe(MESSAGES.googleUnfinished);
    expect(
      friendlyError({ __isAuthError: true, name: "AuthApiError", message: "Signups not allowed for otp" }).text,
    ).toBe(MESSAGES.noAccount);
  });

  it("keeps messages that Habi wrote", () => {
    expect(friendlyError(new Error("Unlock the vault first.")).text).toBe("Unlock the vault first.");
    expect(friendlyError(db("P0001", "Tick the items you bought first.")).text).toBe(
      "Tick the items you bought first.",
    );
    expect(friendlyError(db("P0001", "channel_limit")).text).toBe(MESSAGES.channels);
  });

  it("uses a screen's own words for a code", () => {
    const own = "You already have an account with this name. Change the name, then save again.";
    expect(friendlyError(db("23505", "duplicate key"), { "23505": own }).text).toBe(own);
  });

  it("never shows a technical text", () => {
    const shown = friendlyError(new Error("duplicate key value violates unique constraint")).text;
    expect(shown).toBe(MESSAGES.unknown);
    expect(friendlyError(undefined).text).toBe(MESSAGES.unknown);
  });

  it("keeps the code for the admin", () => {
    expect(friendlyError(db("23505", "duplicate key")).code).toBe("23505");
  });
});
