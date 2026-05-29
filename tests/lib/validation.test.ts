import { describe, it, expect } from "vitest";
import { isValidCRWhatsApp, normalizeCRWhatsApp } from "@/lib/validation";

describe("CR WhatsApp validation", () => {
  it("accepts 8-digit local numbers", () => {
    expect(isValidCRWhatsApp("88887777")).toBe(true);
  });
  it("accepts numbers with country code 506", () => {
    expect(isValidCRWhatsApp("+50688887777")).toBe(true);
  });
  it("rejects too-short numbers", () => {
    expect(isValidCRWhatsApp("1234")).toBe(false);
  });
  it("normalizes to 506XXXXXXXX digits only", () => {
    expect(normalizeCRWhatsApp("8888-7777")).toBe("50688887777");
    expect(normalizeCRWhatsApp("+506 8888 7777")).toBe("50688887777");
  });
});
