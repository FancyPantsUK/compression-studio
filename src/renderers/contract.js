/**
 * Compression Contract — shared shape for all point panels
 *
 * Every point produces a contract object before rendering.
 * The contract captures the compression spine (state, signal,
 * implication, expression, risk, whatChanges) plus point-specific
 * rich sections.
 */

/**
 * Create a compression contract with sensible defaults.
 *
 * @param {object} fields — override any defaults
 * @returns {object} validated contract
 */
export const createContract = (fields) => {
    const c = {
        id:    '',
        label: '',
        title: '',

        // Compression spine
        state:       null,   // string — 'Expansion' | 'Caution' | 'Neutral' | …
        signal:      null,   // string — primary signal sentence
        implication: null,   // string — what it means for positioning

        expression:  null,   // string[] — actionable trades / expressions
        risk:        null,   // string — key risk or watch
        whatChanges: null,   // string — what would change the view

        sources:     null,   // string[] — data provenance

        // Badge (derived from state, but explicit for renderer)
        badgeText:   null,   // string — chip label
        badgeType:   'neutral', // 'bull' | 'bear' | 'neutral'

        // Headline for module header
        headline:    '',

        // Intro prose (optional)
        introTitle:  null,   // h2 text
        introProse:  null,   // p text

        // Compass quote (optional)
        compassQuote: null,
        compassLabel: null,

        // Domino (gate + forward directive)
        dominoGate:  null,
        dominoFwd:   null,

        // Point-specific rich sections
        // Each: { type: string, data: any }
        sections:    [],

        // Footer note (optional, e.g. "as of …")
        footerNote:  null,

        ...fields,
    }

    return c
}

/**
 * Validate a contract — returns array of warnings (empty = valid).
 * Lightweight runtime check, not a hard gate.
 */
export const validateContract = (c) => {
    const w = []
    if (!c.id)    w.push('missing id')
    if (!c.label) w.push('missing label')
    if (!c.title) w.push('missing title')
    if (c.sections && !Array.isArray(c.sections)) w.push('sections must be array')
    if (c.expression && !Array.isArray(c.expression)) w.push('expression must be array')
    if (c.sources && !Array.isArray(c.sources)) w.push('sources must be array')
    return w
}
