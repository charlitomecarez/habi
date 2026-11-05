import { describe, expect, it } from "vitest";

import { checkMasterPassword } from "@/lib/master-password";

describe("checkMasterPassword", () => {
  it("refuses a short password", () => {
    expect(checkMasterPassword("password1234")).toContain("16");
    expect(checkMasterPassword("fifteen chars!!")).toContain("16");
  });

  it.each([
    "passwordpassword",
    "PasswordPassword1234",
    "password1234567890",
    "1234567890123456",
    "qwertyuiop123456",
    "aaaaaaaaaaaaaaaa",
    "abcabcabcabcabcabc",
    "iloveyou12345678!",
  ])("refuses %s", (password) => {
    expect(checkMasterPassword(password)).toContain("too common");
  });

  it("accepts a lowercase passphrase", () => {
    expect(checkMasterPassword("river candle tiger mango")).toBeNull();
    expect(checkMasterPassword("correcthorsebatterystaple")).toBeNull();
  });
});
