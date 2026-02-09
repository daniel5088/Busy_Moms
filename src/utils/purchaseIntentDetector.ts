export function detectPurchaseIntent(text: string): boolean {
  const textLower = text.toLowerCase();

  return (
    textLower.includes('birthday') ||
    textLower.includes('anniversary') ||
    textLower.includes('wedding') ||
    textLower.includes('graduation') ||
    textLower.includes('baby shower') ||
    textLower.includes('housewarming') ||
    textLower.includes('retirement') ||
    !!textLower.match(/\b(gift|present)\b/)
  );
}
