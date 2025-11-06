export interface ColorOption {
  name: string;
  hex: string;
}

export const colorPalette: ColorOption[] = [
  { name: 'pastelRed', hex: '#F8B4B4' },
  { name: 'pastelOrange', hex: '#FBC9A9' },
  { name: 'pastelPeach', hex: '#FBD1B7' },
  { name: 'pastelYellow', hex: '#FAE3A0' },
  { name: 'pastelLime', hex: '#D7F5A3' },
  { name: 'pastelGreen', hex: '#A8E6CF' },
  { name: 'pastelMint', hex: '#B2F2BB' },
  { name: 'pastelTeal', hex: '#A0E7E5' },
  { name: 'pastelCyan', hex: '#99E9F2' },
  { name: 'pastelSky', hex: '#A5D8FF' },
  { name: 'pastelBlue', hex: '#B5C7F2' },
  { name: 'pastelLavender', hex: '#CDB4DB' },
  { name: 'pastelPurple', hex: '#D0BFFF' },
  { name: 'pastelPink', hex: '#FFAFCC' },
  { name: 'pastelRose', hex: '#F4C2C2' },
  { name: 'pastelGray', hex: '#E2E2E2' }
];

export function getAvailableColors(used: string[]): string[] {
  const usedSet = new Set(used.map(color => color.toLowerCase()));
  return colorPalette
    .filter(color => !usedSet.has(color.name.toLowerCase()))
    .map(color => color.name);
}

export function getRandomColor(available: string[]): string | null {
  if (!available || available.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

export function validateUniqueColor(colors: string[]): boolean {
  if (!colors || colors.length === 0) {
    return true;
  }
  const uniqueColors = new Set(colors.map(color => color.toLowerCase()));
  return uniqueColors.size === colors.length;
}

export const ALL = colorPalette.map(color => color.hex);
