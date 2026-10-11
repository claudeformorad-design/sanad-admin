import { vi } from "vitest";
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }) }));
vi.mock("next/navigation", () => ({ redirect: () => undefined }));
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

describe("setup code", () => {
  it("accepts the code however it is typed, and says when none is configured", async () => {
    const { checkSetupCode, setupCodeConfigured } = await import("@/lib/auth");
    delete process.env.ADMIN_SETUP_CODE;
    expect(setupCodeConfigured()).toBe(false);
    expect(await checkSetupCode("anything")).toBe(false);
    process.env.ADMIN_SETUP_CODE = "4A2H-JEDC-457D";
    expect(setupCodeConfigured()).toBe(true);
    for (const typed of ["4A2H-JEDC-457D", "4a2h-jedc-457d", " 4A2H JEDC 457D ", "٤A2H-JEDC-٤٥٧D", "4A2HJEDC457D"]) {
      expect(await checkSetupCode(typed)).toBe(true);
    }
    expect(await checkSetupCode("4A2H-JEDC-457E")).toBe(false);
  });
});
