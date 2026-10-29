import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const destination = resolve(root, 'public/characters.json')
await mkdir(dirname(destination), { recursive: true })
await copyFile(resolve(root, '../data/processed/characters.json'), destination)
console.log('Synced scraped data to frontend/public/characters.json')
