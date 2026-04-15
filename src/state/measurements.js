/**
 * Measurements layer — upload-governed market state selectors
 *
 * Source of truth: uploaded rotation snapshots (industry, liquidity, master).
 * Every value here comes from parsed upload data or the liquidity/rotation API.
 * No MIT interpretation belongs here.
 */
import { liqFullRows } from './store.js'

// ── Liquidity state ─────────────────────────────────────────────────────────

const LIQ_EXPAND_KEYWORDS  = ['expand', 'rising', 'easy', 'positive']
const LIQ_CONTRACT_KEYWORDS = ['contract', 'tight', 'falling', 'negative']

export const getLiquidityState = (bd) => {
    const liq   = bd?.liquidity_rotation || {}
    const state = liq.liquidity_state || ''
    const stateL = state.toLowerCase()
    const isExpanding   = LIQ_EXPAND_KEYWORDS.some(w => stateL.includes(w))
    const isContracting = LIQ_CONTRACT_KEYWORDS.some(w => stateL.includes(w))
    return {
        state,
        isExpanding,
        isContracting,
        avg1d: liq.avg_1d,
        avg1m: liq.avg_1m,
        avg3m: liq.avg_3m,
        topBy1w: liq.top_by_1w || [],
        topBy1m: liq.top_by_1m || [],
    }
}

// ── Industry breadth ────────────────────────────────────────────────────────

const extractBreadth = (rotObj, tf) => {
    const b = ((rotObj?.breadth || {})[tf] || {})
    return {
        pct:   b.pct_positive,
        count: b.count,
        total: b.total,
    }
}

export const getIndustryBreadth = (bd) => {
    const ind = bd?.industry_rotation || {}
    return {
        b1w: extractBreadth(ind, '1w'),
        b1m: extractBreadth(ind, '1m'),
        takeaway: ind.expression_takeaway || '',
        topBy1w: ind.top_by_1w || [],
        topBy1m: ind.top_by_1m || [],
    }
}

// ── Master breadth ──────────────────────────────────────────────────────────

export const getMasterBreadth = (bd) => {
    const mst = bd?.master_rotation || {}
    return {
        b1m: extractBreadth(mst, '1m'),
        b3m: extractBreadth(mst, '3m'),
        topBy1m: mst.top_by_1m || [],
        topBy3m: mst.top_by_3m || [],
        rankingSummary: mst.ranking_summary || '',
    }
}

// ── Rotation timestamp ───────────────────────────────────────────────────────

export const getRotationTimestamp = (bd) =>
    bd?.liquidity_rotation?.as_of || bd?.industry_rotation?.as_of || bd?.master_rotation?.as_of || ''

// ── Pair lookup ─────────────────────────────────────────────────────────────

/**
 * Look up a signal pair value from upload rows.
 * Prefers liqFullRows cache, falls back to briefData rotation rows.
 */
export const lookupPair = (rows, key, tf) => {
    const r = rows.find(r => (r.key || '').toUpperCase() === key.toUpperCase())
    return r ? r[tf] : undefined
}

/**
 * Get all liquidity basket rows — prefers full cached rows, falls back to brief.
 */
export const getLiquidityRows = (bd) =>
    liqFullRows.length ? liqFullRows : (bd?.liquidity_rotation?.top_by_1w || [])

/**
 * Find a pair row by partial key match from liquidity basket.
 */
export const findPairRow = (rows, keys) =>
    rows.find(r => keys.some(k => (r.key || '').toLowerCase().includes(k)))

// ── Signal pair status ──────────────────────────────────────────────────────

/**
 * Compute bull/bear/watch/neutral status for a signal pair.
 * Uses 1M as primary, 3M as confirmation.
 */
export const getSignalPairStatus = (sp, rows) => {
    const v5d = lookupPair(rows, sp.key, '5d') ?? lookupPair(rows, sp.key, '1d')
    const v1m = lookupPair(rows, sp.key, '1m')
    const v3m = lookupPair(rows, sp.key, '3m')
    const v1y = lookupPair(rows, sp.key, '1y')

    let status
    if (v1m === undefined && v5d === undefined) {
        status = { text: '—', cls: 'neutral' }
    } else {
        const pri     = v1m !== undefined ? v1m : v5d
        const bull    = sp.invert ? pri < 0 : pri > 0
        const bear    = sp.invert ? pri > 0 : pri < 0
        const weakSec = v3m !== undefined && (sp.invert ? v3m > 0 : v3m < 0)

        if (bull && !weakSec)             status = { text: '▲ BULLISH', cls: 'bull' }
        else if (bull && weakSec)         status = { text: '⚠ WATCH — 3M weak', cls: 'watch' }
        else if (bear && sp.key === 'UUP:SPY') status = { text: '▼ BULLISH (weak $)', cls: 'bull' }
        else if (bear)                    status = { text: '▼ BEARISH', cls: 'bear' }
        else                              status = { text: '~ NEUTRAL', cls: 'neutral' }
    }

    return { v5d, v1m, v3m, v1y, status }
}

// ── Value status helper ─────────────────────────────────────────────────────

export const statusFromVal = (v) => {
    if (v === undefined) return { cls: 'neutral', txt: '—' }
    return v > 0 ? { cls: 'bull', txt: `+${v.toFixed(1)}%` }
         : v < 0 ? { cls: 'bear', txt: `${v.toFixed(1)}%` }
         :         { cls: 'neutral', txt: '0%' }
}

// ── Red/green flag enrichment ───────────────────────────────────────────────

/**
 * Enrich static red flags with dynamic status from upload data.
 */
export const enrichRedFlags = (flags, liqRows, indBreadthPct) => {
    return flags.map(rf => {
        let dynStatus = ''
        if (rf.ticker === 'HYG:IEF') {
            const v = lookupPair(liqRows, 'HYG:IEF', '1m')
            if (v !== undefined) dynStatus = v < 0 ? ' — ACTIVE ⚠' : ' — OK'
        }
        if (rf.ticker === 'EEM:SPY') {
            const v = lookupPair(liqRows, 'EEM:SPY', '1m')
            if (v !== undefined) dynStatus = v < 0 ? ' — ACTIVE ⚠' : ' — OK'
        }
        return { ticker: rf.ticker, desc: rf.desc + dynStatus, trigger: rf.trigger }
    })
}

/**
 * Enrich static green flags with dynamic status from upload data.
 */
export const enrichGreenFlags = (flags, liqRows, indBreadthPct) => {
    return flags.map(gf => {
        let dynStatus = ''
        if (gf.ticker === '1M Breadth') {
            if (indBreadthPct !== undefined) dynStatus = indBreadthPct >= 60 ? ' — CONFIRMED' : indBreadthPct >= 50 ? ' — MARGINAL' : ' — BELOW TARGET'
        }
        if (gf.ticker === 'HYG:IEF') {
            const v = lookupPair(liqRows, 'HYG:IEF', '1m')
            if (v !== undefined) dynStatus = v > 0 ? ' — CONFIRMED' : ' — BELOW TARGET'
        }
        if (gf.ticker === 'EEM:IEF') {
            const v = lookupPair(liqRows, 'EEM:IEF', '1m')
            if (v !== undefined) dynStatus = v > 0 ? ' — CONFIRMED' : ' — WATCH'
        }
        return { ticker: gf.ticker, desc: gf.desc + dynStatus, trigger: gf.target }
    })
}

// ── Watchlist builder ───────────────────────────────────────────────────────

/**
 * Build the 9-row watchlist from upload data.
 */
export const buildWatchlistRows = (liqRows, indBreadthPct) => {
    const sv = (key) => statusFromVal(lookupPair(liqRows, key, '1m'))
    const uup1m = lookupPair(liqRows, 'UUP:SPY', '1m')

    return [
        { pair: 'HYG:IEF',    status: sv('HYG:IEF').cls,   label: sv('HYG:IEF').txt,   note: 'Credit signal — core watch' },
        { pair: 'EEM:SPY',    status: sv('EEM:SPY').cls,    label: sv('EEM:SPY').txt,    note: 'Global risk appetite' },
        { pair: 'IWM:SPY',    status: sv('IWM:SPY').cls,    label: sv('IWM:SPY').txt,    note: 'Breadth / cycle proxy' },
        { pair: 'UUP:SPY',    status: uup1m !== undefined ? (uup1m < 0 ? 'bull' : 'bear') : 'neutral',
                               label: uup1m !== undefined ? (uup1m >= 0 ? '+' : '') + uup1m.toFixed(1) + '%' : '—',
                               note: 'Dollar — invert for risk-on' },
        { pair: 'SOXX:QQQ',   status: sv('SOXX:QQQ').cls,   label: sv('SOXX:QQQ').txt,   note: 'Semis vs tech — AI cycle' },
        { pair: 'EEM:IEF',    status: sv('EEM:IEF').cls,    label: sv('EEM:IEF').txt,    note: 'EM vs bonds — global risk-on' },
        { pair: 'ITB:IEF',    status: sv('ITB:IEF').cls,    label: sv('ITB:IEF').txt,    note: 'Housing vs bonds — rate sensitivity' },
        { pair: 'RSP:SPY',    status: sv('RSP:SPY').cls,    label: sv('RSP:SPY').txt,    note: 'Equal wt vs cap wt — breadth quality' },
        { pair: 'ISM Breadth', status: indBreadthPct !== undefined ? (indBreadthPct >= 55 ? 'bull' : indBreadthPct < 45 ? 'bear' : 'neutral') : 'neutral',
                               label: indBreadthPct !== undefined ? indBreadthPct + '%' : '—',
                               note: 'Manufacturing breadth — cycle stage' },
    ]
}
