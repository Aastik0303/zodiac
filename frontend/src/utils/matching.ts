import type { UserCharacter } from '../types/character'
import { normalizeSign } from './zodiac'
export interface MatchInput { zodiac: string; universe?: string; genres?: string[]; traits?: string[]; avoidCharacterId?: string }
export interface MatchResult { character: UserCharacter; personalityScore?: number; relaxedFilters: string[] }
const QUIZ_TRAITS = [
  [['ambitious','decisive'],['collaborative','empathetic'],['observant','analytical']],
  [['analytical','strategic'],['empathetic','intuitive'],['adaptable','balanced']],
  [['brave','independent'],['disciplined','cautious'],['adaptable','strategic']],
  [['sociable','energetic'],['independent','reflective'],['curious','adaptable']],
  [['disciplined','strategic'],['spontaneous','curious'],['adaptable','balanced']],
  [['brave','direct'],['empathetic','collaborative'],['patient','reflective']],
  [['empathetic','brave'],['empathetic','thoughtful'],['practical','helpful']],
  [['resilient','ambitious'],['curious','adaptable'],['resourceful','independent']],
]
export function traitsFromAnswers(answers: number[]): string[] {
  return [...new Set(answers.flatMap((answer, question) => QUIZ_TRAITS[question]?.[answer] ?? []))]
}
export type ZodiacIndex = Map<string, UserCharacter[]>
export function buildZodiacIndex(characters: UserCharacter[]): ZodiacIndex {
  const index: ZodiacIndex = new Map()
  for (const character of characters) {
    if (!character.active) continue
    for (const sign of character.zodiacSigns) index.set(sign, [...(index.get(sign) ?? []), character])
  }
  return index
}
export function jaccardSimilarity(left: string[], right: string[]): number | null {
  if (!left.length || !right.length) return null
  const a = new Set(left.map(x => x.toLowerCase())), b = new Set(right.map(x => x.toLowerCase()))
  return [...a].filter(x => b.has(x)).length / new Set([...a, ...b]).size
}
export function matchCharacter(source: UserCharacter[] | ZodiacIndex, input: MatchInput, random = Math.random): MatchResult | null {
  const sign = normalizeSign(input.zodiac); if (!sign) return null
  const index = source instanceof Map ? source : buildZodiacIndex(source)
  const allZodiac = index.get(sign) ?? []; if (!allZodiac.length) return null
  const otherZodiac = input.avoidCharacterId ? allZodiac.filter(c => c.id !== input.avoidCharacterId) : allZodiac
  const zodiac = otherZodiac.length ? otherZodiac : allZodiac
  const universe = input.universe && input.universe !== 'All universes' ? input.universe : null, genres = input.genres ?? []
  const byUniverse = universe ? zodiac.filter(c => c.universe === universe) : zodiac
  const byGenre = genres.length ? zodiac.filter(c => genres.some(g => c.genres.includes(g))) : zodiac
  const tiers = [
    { rows: byUniverse.filter(c => !genres.length || genres.some(g => c.genres.includes(g))), relaxed: [] as string[] },
    { rows: byUniverse, relaxed: genres.length ? ['genre'] : [] },
    { rows: byGenre, relaxed: universe ? ['universe'] : [] },
    { rows: zodiac, relaxed: [...(universe ? ['universe'] : []), ...(genres.length ? ['genre'] : [])] },
  ]
  const tier = tiers.find(t => t.rows.length); if (!tier) return null
  const scored = tier.rows.map(character => ({ character, score: jaccardSimilarity(input.traits ?? [], character.traits) }))
  const max = Math.max(...scored.map(x => x.score ?? -1)), tied = scored.filter(x => (x.score ?? -1) === max)
  const pick = tied[Math.min(tied.length - 1, Math.floor(Math.max(0, Math.min(0.999999, random())) * tied.length))]
  return { character: pick.character, ...(pick.score === null ? {} : { personalityScore: pick.score }), relaxedFilters: tier.relaxed }
}
export function filterCharacters(characters: UserCharacter[], options: { query?: string; universe?: string; genres?: string[]; page?: number; pageSize?: number }) {
  const query = (options.query ?? '').trim().toLocaleLowerCase(), genres = options.genres ?? []
  const filtered = characters.filter(c => c.active && (!query || [c.name, ...c.aliases].some(v => v.toLocaleLowerCase().includes(query))) && (!options.universe || options.universe === 'All universes' || c.universe === options.universe) && (!genres.length || genres.some(g => c.genres.includes(g)))).sort((a,b) => a.name.localeCompare(b.name))
  const pageSize = Math.max(1, options.pageSize ?? 24), pageCount = Math.max(1, Math.ceil(filtered.length / pageSize)), page = Math.max(1, Math.min(options.page ?? 1, pageCount))
  return { total: filtered.length, page, pageCount, results: filtered.slice((page - 1) * pageSize, page * pageSize) }
}
