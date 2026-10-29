import { describe, expect, it } from 'vitest'
import { applyCuratedMetadata, isAbortError, normalizeCharacter } from '../services/characterDataService'
import { buildZodiacIndex, filterCharacters, jaccardSimilarity, matchCharacter, traitsFromAnswers } from './matching'
import { normalizeSign, zodiacFromDate } from './zodiac'
import type { UserCharacter } from '../types/character'

const row = (id: string, zodiacSign: string | null = null, universe = 'Anime', traits: string[] = []): UserCharacter => ({id,name:id,aliases:[],universe,franchise:null,description:null,imageUrl:null,zodiacSigns:zodiacSign?[zodiacSign]:[],genres:[],traits,paragraphs:[],active:true,sourceUrl:null,attribution:null})
describe('zodiac utilities', () => {
  it('normalizes manual sign choices', () => { expect(normalizeSign('  sAgItTaRiUs ')).toBe('Sagittarius'); expect(normalizeSign('Ophiuchus')).toBeNull() })
  it('calculates signs at Western zodiac boundaries', () => { expect(zodiacFromDate('2000-03-20')).toBe('Pisces'); expect(zodiacFromDate('2000-03-21')).toBe('Aries'); expect(zodiacFromDate('2000-12-22')).toBe('Capricorn') })
  it('rejects invalid and future dates', () => { expect(zodiacFromDate('2001-02-29')).toBeNull(); expect(zodiacFromDate('2099-01-01')).toBeNull() })
})
describe('character data normalization', () => {
  it('normalizes optional fields and ignores local paths', () => { const c=normalizeCharacter({name:'Leia',universe:'Star Wars',image_local_path:'data/images/leia.webp',personality_traits:null}); expect(c?.imageUrl).toBeNull(); expect(c?.traits).toEqual([]); expect(c?.name).toBe('Leia') })
  it('rejects malformed records and unsafe image schemes', () => { expect(normalizeCharacter({name:'Only name'})).toBeNull(); expect(normalizeCharacter({name:'Leia',universe:'Star Wars',image_url:'javascript:alert(1)'})?.imageUrl).toBeNull() })
  it('accepts explicit multi-sign metadata while keeping source shapes unchanged', () => { expect(normalizeCharacter({name:'Test',universe:'Other',zodiac:['Leo','Pisces'],paragraphs:['Curated.']})?.zodiacSigns).toEqual(['Leo','Pisces']) })
  it('recognizes expected fetch cancellation', () => { expect(isAbortError(new DOMException('Aborted','AbortError'))).toBe(true); expect(isAbortError(new Error('offline'))).toBe(false) })
  it('applies curated matching metadata as an independent overlay', () => { const original=normalizeCharacter({name:'Curated',universe:'Other'})!; const updated=applyCuratedMetadata(original,{zodiacSigns:['Leo','invalid'],traits:['brave'],active:false}); expect(updated.zodiacSigns).toEqual(['Leo']); expect(updated.traits).toEqual(['brave']); expect(updated.active).toBe(false); expect(original.zodiacSigns).toEqual([]) })
})
describe('matching and explorer utilities', () => {
  it('returns no invented association when zodiac metadata is absent', () => { expect(matchCharacter([row('Leia')],{zodiac:'Libra'})).toBeNull() })
  it('indexes multi-sign metadata and skips inactive records', () => { const index=buildZodiacIndex([{...row('one','Leo'),zodiacSigns:['Leo','Pisces']},{...row('off','Leo'),active:false}]); expect(index.get('Pisces')?.[0].id).toBe('one'); expect(index.get('Leo')).toHaveLength(1) })
  it('filters by sign, universe, and genre metadata progressively', () => { const rows=[row('one','Leo'),row('two','Leo','DC')]; expect(matchCharacter(rows,{zodiac:'Leo',universe:'Anime',genres:['Fantasy']},()=>0)?.relaxedFilters).toEqual(['genre']); expect(matchCharacter(rows,{zodiac:'Leo',universe:'DC',genres:['Fantasy']},()=>0)?.character.name).toBe('two') })
  it('calculates Jaccard only when both sides have traits', () => { expect(jaccardSimilarity([],['brave'])).toBeNull(); expect(jaccardSimilarity(['Brave','curious'],['brave'])).toBe(0.5) })
  it('normalizes optional quiz answers to deduplicated traits', () => { expect(traitsFromAnswers([0,0,-1])).toEqual(['ambitious','decisive','analytical','strategic']) })
  it('chooses equal-score candidates randomly within the tie group', () => { const result=matchCharacter([row('a','Aries'),row('b','Aries')],{zodiac:'Aries'},()=>0.9); expect(result?.character.id).toBe('b') })
  it('avoids repeating the last result when another zodiac candidate exists', () => { const result=matchCharacter([row('a','Aries'),row('b','Aries')],{zodiac:'Aries',avoidCharacterId:'a'}); expect(result?.character.id).toBe('b') })
  it('filters, sorts, searches aliases, paginates, and handles empty data', () => { const rows=[{...row('B'),aliases:['Bee']},{...row('A')}]; expect(filterCharacters(rows,{query:'bee'}).results[0].id).toBe('B'); expect(filterCharacters(rows,{page:9,pageSize:1}).page).toBe(2); expect(filterCharacters([],{query:'missing'}).results).toEqual([]) })
})
