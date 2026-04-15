/**
 * Interpretation layer — MIT-governed framing selectors
 *
 * Source of truth: MIT Expression Brain brief endpoint.
 * Every value here comes from /api/brief → briefData.
 * No upload-derived values belong here.
 */
import { strip } from '../utils.js'

// ── Regime ──────────────────────────────────────────────────────────────────

const EXPANSION_KEYWORDS = ['expansion', 'bull', 'risk on', 'accelerat', 'recovery']
const CAUTION_KEYWORDS   = ['risk off', 'contract', 'recession', 'tighten']
const REVERSAL_KEYWORDS  = ['reversal', 'breakdown', 'breaking', 'no longer']

export const getRegime = (bd) => {
    if (!bd) return { view: '', isExpansion: false, isCaution: false, badgeText: 'Neutral', badgeType: 'neutral' }
    const rv    = strip(bd.regime_view)
    const rvLow = rv.toLowerCase()
    const isExpansion = EXPANSION_KEYWORDS.some(w => rvLow.includes(w))
    const isCaution   = CAUTION_KEYWORDS.some(w => rvLow.includes(w))
    return {
        view:        rv,
        isExpansion,
        isCaution,
        badgeText:   isExpansion ? 'Expansion' : isCaution ? 'Caution' : 'Neutral',
        badgeType:   isExpansion ? 'bull' : isCaution ? 'bear' : 'neutral',
    }
}

// ── Drivers ─────────────────────────────────────────────────────────────────

export const getDrivers = (bd) =>
    (bd?.key_drivers || []).slice(0, 6).map(strip)

export const getPrimaryDriver = (bd) =>
    strip((bd?.key_drivers || [])[0])

// ── Expressions ─────────────────────────────────────────────────────────────

export const getExpressions = (bd) =>
    (bd?.best_expressions || []).slice(0, 5).map(strip)

// ── Risks ───────────────────────────────────────────────────────────────────

export const getRisks = (bd) =>
    (bd?.risks_or_watchpoints || []).slice(0, 4).map(strip)

// ── Summary ─────────────────────────────────────────────────────────────────

export const getSummary = (bd) =>
    strip(bd?.summary || '')

// ── What changed ────────────────────────────────────────────────────────────

export const getWhatChanged = (bd) => {
    const text = strip(bd?.what_changed || '')
    const noReversal = !REVERSAL_KEYWORDS.some(w => text.toLowerCase().includes(w))
    return { text, noReversal }
}

// ── Issue dates ─────────────────────────────────────────────────────────────

export const getIssueDates = (bd) => ({
    current:  bd?.current_issue || '',
    previous: bd?.previous_issue || '',
})
