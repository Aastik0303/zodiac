export interface Character {
  character_id: string; name: string; aliases: string[]; universe: string; franchise?: string | null
  character_type?: string | null; species?: string | null; gender?: string | null; birth_date?: string | null
  zodiac_sign?: string | null; zodiac?: string | string[]; personality_traits: string[]; traits?: string[]
  genres?: string[]; paragraphs?: string[]; active?: boolean; description?: string | null
  image_url?: string | null; image_local_path?: string | null; source_name?: string | null
  source_url?: string | null; image_license?: string | null; attribution?: string | null
}
export interface UserCharacter {
  id: string; name: string; aliases: string[]; universe: string; franchise: string | null
  description: string | null; imageUrl: string | null; zodiacSigns: string[]; genres: string[]
  traits: string[]; paragraphs: string[]; active: boolean; sourceUrl: string | null; attribution: string | null
}
