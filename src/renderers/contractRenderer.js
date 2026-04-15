/**
 * Contract Renderer — renders a compression contract into HTML
 *
 * Renders the shared spine consistently, then delegates to
 * section-type renderers for point-specific richness.
 */
import { moduleHeader, dominoBlock, compassBlock } from './components.js'

/**
 * Registry of section-type renderers.
 * Each key maps to a function: (data) => htmlString
 * Points register their own section types here.
 */
const sectionRenderers = {}

export const registerSectionRenderer = (type, fn) => {
    sectionRenderers[type] = fn
}

/**
 * Render a single section by type.
 * Falls back to raw JSON dump if type is unknown.
 */
const renderSection = (section) => {
    const fn = sectionRenderers[section.type]
    if (fn) return fn(section.data)
    // Fallback — should not happen in production
    return `<div class="pb-section"><div class="pb-section-label">${section.type}</div><pre style="opacity:0.4;font-size:10px">${JSON.stringify(section.data, null, 2)}</pre></div>`
}

/**
 * Render a full contract into detail panel HTML.
 *
 * @param {object} contract — a validated compression contract
 * @returns {string} HTML string
 */
export const renderContract = (contract) => {
    const c = contract
    const parts = []

    // 1. Module header (always)
    parts.push(moduleHeader(c.label, c.headline || '—', c.badgeText, c.badgeType))

    // 2. Intro (optional)
    if (c.introTitle) {
        parts.push(`<h2 class="pb-h2">${c.introTitle}</h2>`)
    }
    if (c.introProse) {
        parts.push(`<p class="pb-intro">${c.introProse}</p>`)
    }

    // 3. Compass (optional)
    if (c.compassQuote) {
        parts.push(compassBlock(c.compassQuote, c.compassLabel))
    }

    // 4. Point-specific sections
    for (const section of c.sections) {
        parts.push(renderSection(section))
    }

    // 5. Small note (optional)
    if (c.smallNote) {
        parts.push(`<div class="pb-small-note">${c.smallNote}</div>`)
    }

    // 6. Domino (optional)
    if (c.dominoGate || c.dominoFwd) {
        parts.push(dominoBlock(c.dominoGate, c.dominoFwd))
    }

    // 7. Footer (optional, e.g. "as of …")
    if (c.footerNote) {
        parts.push(`<div class="detail-section"><div style="opacity:0.4;font-size:10px;font-family:var(--pb-mono)">${c.footerNote}</div></div>`)
    }

    return parts.join('')
}
