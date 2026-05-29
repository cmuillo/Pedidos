export function normalizeCRWhatsApp(input: string): string {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("506") ? digits.slice(3) : digits;
  return "506" + local;
}

export function isValidCRWhatsApp(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("506") ? digits.slice(3) : digits;
  return /^[2-8]\d{7}$/.test(local);
}
