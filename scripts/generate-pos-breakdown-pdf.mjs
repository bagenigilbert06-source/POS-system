import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: { width: 794, height: 1123 },
  deviceScaleFactor: 1,
})

await page.goto(`file://${path.join(root, 'docs/pesaby-pos-breakdown-only.html')}`, {
  waitUntil: 'networkidle',
})

await page.pdf({
  path: path.join(root, 'Pesaby_POS_Breakdown_Only.pdf'),
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
})

await browser.close()
console.log('Created Pesaby_POS_Breakdown_Only.pdf')
