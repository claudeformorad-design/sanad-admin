import { describe, expect, it } from "vitest";
import { passwordScore, strongPassword } from "@/lib/password";

describe("password policy", () => {
  it("needs 10 characters with a letter, a digit and a symbol", () => {
    expect(strongPassword("Secret-pass-123!")).toBe(true);
    expect(strongPassword("كلمةسر-قوية٢٠٢٦")).toBe(true);
    expect(strongPassword("onlyletters")).toBe(false);
    expect(strongPassword("letters1234")).toBe(false);
    expect(strongPassword("S-1!short")).toBe(false);
    expect(strongPassword("1234567890!!")).toBe(false);
    expect(passwordScore("")).toBe(0);
    expect(passwordScore("Secret-pass-123!")).toBe(4);
  });
});
