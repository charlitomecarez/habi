import { describe, expect, it, vi } from "vitest";

import { GENERATED_LENGTH, generatePassword, passwordStrength, suggestPassphrase } from "@/lib/password";

let seed = 7;
vi.mock("react-native-libsodium", () => ({
  default: {
    ready: Promise.resolve(),
    randombytes_uniform: (max: number) => {
      seed = (seed * 31 + 11) % 9973;
      return seed % max;
    },
  },
  loadSumoVersion: () => {},
}));

describe("password tools", () => {
  it("makes a password with each kind of character and no look-alikes", async () => {
    const pw = await generatePassword();
    expect(pw).toHaveLength(GENERATED_LENGTH);
    for (const kind of [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/]) expect(pw).toMatch(kind);
    expect(pw).not.toMatch(/[lIO01]/);
  });

  it("suggests six words", async () => {
    expect((await suggestPassphrase()).split(" ")).toHaveLength(6);
  });

  it("scores strength from length and kinds", () => {
    expect(passwordStrength("")).toEqual({ score: 0, label: "Very weak" });
    expect(passwordStrength("aaaaaaaa").label).toBe("Very weak");
    expect(passwordStrength("abcdEF12").label).toBe("Fair");
    expect(passwordStrength("abcdEF12!xyz").label).toBe("Good");
    expect(passwordStrength("abcdEF12!xyzQRST").label).toBe("Strong");
  });
});
