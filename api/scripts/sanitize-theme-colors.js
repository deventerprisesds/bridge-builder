/**
 * One-time migration: sanitize themeColor in all BridgeApps rows.
 *
 * Reads AZURE_STORAGE_CONNECTION_STRING from environment or local.settings.json.
 * Run with: node scripts/sanitize-theme-colors.js
 */

'use strict'

const { TableClient } = require('@azure/data-tables')
const path = require('path')
const fs   = require('fs')

// ── Connection string ─────────────────────────────────────────────────────────
let connString = process.env.AZURE_STORAGE_CONNECTION_STRING

if (!connString) {
  const settingsPath = path.join(__dirname, '..', 'local.settings.json')
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
      connString = settings?.Values?.AZURE_STORAGE_CONNECTION_STRING
    } catch { /* ignore */ }
  }
}

if (!connString || connString.includes('[from')) {
  console.error('ERROR: AZURE_STORAGE_CONNECTION_STRING is not set.')
  console.error('  Set it as an environment variable, or populate local.settings.json.')
  process.exit(1)
}

// ── Validation ────────────────────────────────────────────────────────────────
const HEX_RE  = /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3}([0-9A-Fa-f]{2})?)?$/
const FALLBACK = '#1e40af'

function sanitizeThemeColor(value) {
  if (typeof value === 'string' && HEX_RE.test(value)) return value
  return FALLBACK
}

function sanitizeConfigJson(json) {
  if (!json) return json
  try {
    const parsed = JSON.parse(json)
    if (parsed && typeof parsed === 'object' && 'themeColor' in parsed) {
      parsed.themeColor = sanitizeThemeColor(parsed.themeColor)
      return JSON.stringify(parsed)
    }
    return json
  } catch {
    return json
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  const table = TableClient.fromConnectionString(connString, 'BridgeApps')

  let total = 0
  let fixed = 0

  for await (const entity of table.listEntities()) {
    total++
    const rawColor  = entity['ThemeColor']  ?? ''
    const rawConfig = entity['ConfigJson']  ?? ''

    const cleanColor  = sanitizeThemeColor(rawColor)
    const cleanConfig = sanitizeConfigJson(rawConfig)

    const colorBad  = cleanColor  !== rawColor
    const configBad = cleanConfig !== rawConfig

    if (!colorBad && !configBad) continue

    fixed++
    const appName = entity['AppName'] ?? entity.rowKey

    if (colorBad)  console.log(`  [${appName}] ThemeColor: ${JSON.stringify(rawColor)} -> ${cleanColor}`)
    if (configBad) {
      const before = JSON.parse(rawConfig)?.themeColor
      const after  = JSON.parse(cleanConfig)?.themeColor
      console.log(`  [${appName}] ConfigJson.themeColor: ${JSON.stringify(before)} -> ${after}`)
    }

    await table.updateEntity(
      {
        partitionKey: entity.partitionKey,
        rowKey:       entity.rowKey,
        ThemeColor:   cleanColor,
        ConfigJson:   cleanConfig,
      },
      'Merge'
    )
  }

  console.log(`\nDone. Scanned ${total} app(s), fixed ${fixed}.`)
}

run().catch(err => { console.error(err); process.exit(1) })
