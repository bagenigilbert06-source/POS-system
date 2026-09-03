import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const drizzleDirectory = resolve(process.cwd(), 'drizzle')
const journal = JSON.parse(await readFile(resolve(drizzleDirectory, 'meta', '_journal.json'), 'utf8'))
const sqlFiles = (await readdir(drizzleDirectory))
  .filter((file) => /^\d{4}.*\.sql$/.test(file))
  .map((file) => file.slice(0, -4))
const tags = journal.entries.map((entry) => entry.tag)
const missing = sqlFiles.filter((tag) => !tags.includes(tag))
const orphaned = tags.filter((tag) => !sqlFiles.includes(tag))
const invalidOrder = journal.entries.some((entry, index) => entry.idx !== index || (index > 0 && entry.when < journal.entries[index - 1].when))

if (missing.length || orphaned.length || invalidOrder) {
  console.error(JSON.stringify({ missing, orphaned, invalidOrder }, null, 2))
  process.exit(1)
}

console.log(`Migration journal is complete and ordered: ${tags.length} entries.`)
