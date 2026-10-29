import type { Character, UserCharacter } from '../types/character'
import { normalizeSign } from '../utils/zodiac'
import curatedMetadata from '../data/curatedCharacterMetadata.json'
export interface CuratedMetadata { zodiacSigns?: string[]; genres?: string[]; traits?: string[]; paragraphs?: string[]; active?: boolean; imageUrl?: string; sourceUrl?: string; attribution?: string }
const text = (v: unknown): string | null => typeof v === 'string' && v.trim() ? v.trim() : null
const list = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map(x => x.trim()).filter(Boolean) : []
const strings = (v: unknown): string[] => typeof v === 'string' ? [v] : list(v)
const safeUrl = (v: unknown): string | null => {
  const value = text(v); if (!value) return null
  try { const url = new URL(value, window.location.origin); return ['http:', 'https:'].includes(url.protocol) ? url.href : null } catch { return null }
}
export function normalizeCharacter(record: unknown): UserCharacter | null {
  if (!record || typeof record !== 'object') return null
  const raw = record as Partial<Character>, name = text(raw.name), universe = text(raw.universe)
  if (!name || !universe) return null
  const id = text(raw.character_id) ?? text((raw as Partial<Character> & {id?: string}).id) ?? `${universe}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const zodiacSigns = [...new Set([...strings(raw.zodiac_sign), ...strings(raw.zodiac)].map(normalizeSign).filter((value): value is NonNullable<typeof value> => value !== null))]
  const description = text(raw.description)
  const paragraphs = list(raw.paragraphs)
  const traits = list(raw.personality_traits).length ? list(raw.personality_traits) : list(raw.traits)
  return { id, name, aliases: list(raw.aliases), universe, franchise: text(raw.franchise), description, imageUrl: safeUrl(text(raw.image_url) ?? (raw as Partial<Character> & {image?: string}).image), zodiacSigns, genres: list(raw.genres), traits, paragraphs: paragraphs.length ? paragraphs : description ? [description] : [], active: raw.active !== false, sourceUrl: safeUrl(raw.source_url), attribution: text(raw.attribution) }
}

export function isAbortError(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'name' in error && (error as {name?: unknown}).name === 'AbortError'
}
export function applyCuratedMetadata(character: UserCharacter, metadata?: CuratedMetadata): UserCharacter {
  if (!metadata) return character
  const zodiacSigns = metadata.zodiacSigns?.map(normalizeSign).filter((value): value is NonNullable<typeof value> => value !== null)
  return {
    ...character,
    ...(zodiacSigns ? { zodiacSigns: [...new Set(zodiacSigns)] } : {}),
    ...(metadata.genres ? { genres: list(metadata.genres) } : {}),
    ...(metadata.traits ? { traits: list(metadata.traits) } : {}),
    ...(metadata.paragraphs ? { paragraphs: list(metadata.paragraphs) } : {}),
    ...(metadata.active === undefined ? {} : { active: metadata.active }),
    ...(metadata.imageUrl ? { imageUrl: safeUrl(metadata.imageUrl) } : {}),
    ...(metadata.sourceUrl ? { sourceUrl: safeUrl(metadata.sourceUrl) } : {}),
    ...(metadata.attribution ? { attribution: text(metadata.attribution) } : {}),
  }
}
export async function loadCharacters(signal?: AbortSignal): Promise<UserCharacter[]> {
  const response = await fetch('/characters.json', { signal })
  if (!response.ok) throw new Error(`Character data could not be loaded (${response.status}).`)
  const payload: unknown = await response.json()
  const rows = Array.isArray(payload) ? payload : payload && typeof payload === 'object' && Array.isArray((payload as {characters?: unknown}).characters) ? (payload as {characters: unknown[]}).characters : []
  const seen = new Set<string>()
  return rows.map(normalizeCharacter).filter((item): item is UserCharacter => item !== null).map(item => applyCuratedMetadata(item, (curatedMetadata as Record<string, CuratedMetadata>)[item.id])).filter(item => !seen.has(item.id) && !!seen.add(item.id))
}
