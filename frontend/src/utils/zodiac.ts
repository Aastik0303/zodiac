export const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'] as const
export type ZodiacSign = typeof SIGNS[number]
export function normalizeSign(value: string): ZodiacSign | null { return SIGNS.find(sign => sign.toLowerCase() === value.trim().toLowerCase()) ?? null }
export function zodiacFromDate(value: string, today = new Date()): ZodiacSign | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number), date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || date > today || year < 1900) return null
  const md = month * 100 + day
  if (md >= 321 && md <= 419) return 'Aries'; if (md >= 420 && md <= 520) return 'Taurus'
  if (md >= 521 && md <= 620) return 'Gemini'; if (md >= 621 && md <= 722) return 'Cancer'
  if (md >= 723 && md <= 822) return 'Leo'; if (md >= 823 && md <= 922) return 'Virgo'
  if (md >= 923 && md <= 1022) return 'Libra'; if (md >= 1023 && md <= 1121) return 'Scorpio'
  if (md >= 1122 && md <= 1221) return 'Sagittarius'; if (md >= 1222 || md <= 119) return 'Capricorn'
  if (md <= 218) return 'Aquarius'; return 'Pisces'
}
