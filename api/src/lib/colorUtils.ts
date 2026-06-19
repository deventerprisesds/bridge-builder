const HEX_RE = /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3}([0-9A-Fa-f]{2})?)?$/

const FALLBACK = '#1e40af'

/** Returns the value unchanged if it is a valid AAPT hex color, otherwise returns the fallback. */
export function sanitizeThemeColor(value: string | undefined | null): string {
  if (value && HEX_RE.test(value)) return value
  return FALLBACK
}

/** Parses a ConfigJson string, sanitizes themeColor inside it, and returns the re-serialized string.
 *  Returns the original string unchanged if it cannot be parsed. */
export function sanitizeConfigJson(configJson: string | undefined | null): string {
  if (!configJson) return ''
  try {
    const parsed = JSON.parse(configJson)
    if (parsed && typeof parsed === 'object' && 'themeColor' in parsed) {
      parsed.themeColor = sanitizeThemeColor(parsed.themeColor)
    }
    return JSON.stringify(parsed)
  } catch {
    return configJson
  }
}
