import assert from 'node:assert/strict'
import fs from 'node:fs'

const terminal = fs.readFileSync('components/pos/pos-terminal.tsx', 'utf8')
const shift = fs.readFileSync('components/pos/cashier-shift-strip.tsx', 'utf8')
const styles = fs.readFileSync('app/globals.css', 'utf8')

assert.match(terminal, /card: 'pos-card rounded-\[8px\]/)
assert.match(terminal, /panel:\s*'pos-card pos-card-muted rounded-\[8px\]/)
assert.match(shift, /pos-shift-strip[^"']*rounded-\[8px\][^"']*bg-white/)
assert.doesNotMatch(shift, /pos-shift-strip[^"']*bg-gradient/)
assert.match(styles, /body:has\(\.pos-workspace\) \[role='dialog'\]/)
assert.match(styles, /--pos-orange: #e94e1b/)

console.log('POS visual system rules passed')
