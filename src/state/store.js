import { issueDate } from '../utils.js'

// ── Layer B: Interpretation (MIT-governed) ──────────────────────────────────
import { getRegime, getIssueDates, getRisks } from './interpretation.js'

// ── Layer A: Measurements (upload-governed) ─────────────────────────────────
import { getLiquidityState, getIndustryBreadth, getMasterBreadth } from './measurements.js'

// ── Mutable app state ────────────────────────────────────────────────────────
export let briefData   = null
export let liqFullRows = []

// ── Populate brief data into point hover text + topbar ───────────────────────
export const populateBrief = (d, POINTS) => {
    POINTS.forEach(cfg => cfg.populate(d))

    // Layer B: Interpretation — regime for seal, issue date for topbar
    const regime = getRegime(d)
    const dates  = getIssueDates(d)

    const sealEl  = document.getElementById('sealText')
    const issueEl = document.getElementById('tbIssue')
    if(sealEl && regime.view) {
        const first = regime.view.split('.')[0].slice(0, 64)
        sealEl.textContent = first
    }
    if(issueEl) issueEl.textContent = issueDate(dates.current)
}

// ── State ring computation ───────────────────────────────────────────────────
export const computePointStates = (bd, POINTS) => {
    // Layer A: Measurements
    const liq = getLiquidityState(bd)
    const ind = getIndustryBreadth(bd)
    const mst = getMasterBreadth(bd)

    const indConf = typeof ind.b1w.pct === 'number' && ind.b1w.pct >= 60
    const indCaut = typeof ind.b1w.pct === 'number' && ind.b1w.pct < 40

    const mstConf = typeof mst.b1m.pct === 'number' && mst.b1m.pct >= 55
    const mstCaut = typeof mst.b1m.pct === 'number' && mst.b1m.pct < 40

    // Layer B: Interpretation
    const regime = getRegime(bd)
    const rvConf = regime.isExpansion
    const rvCaut = regime.isCaution

    const risks  = getRisks(bd)
    const riskText = risks.slice(0, 3).join(' ').toLowerCase()
    const riskCaut = ['elevated', 'accelerat', 'material', 'significant', 'trigger', 'breaking', 'deteriorat'].some(w => riskText.includes(w))

    const states = {
        '1': rvCaut ? 'caution' : rvConf ? 'confirming' : 'neutral',
        '2': rvCaut ? 'caution' : rvConf ? 'confirming' : 'neutral',
        '3': indCaut ? 'caution' : indConf ? 'confirming' : 'neutral',
        '4': mstCaut ? 'caution' : mstConf ? 'confirming' : 'neutral',
        '5': liq.isContracting ? 'caution' : liq.isExpanding ? 'confirming' : 'neutral',
        '6': rvCaut ? 'caution' : rvConf ? 'confirming' : 'neutral',
        '7': riskCaut ? 'caution' : 'neutral',
        '8': 'neutral',
    }

    POINTS.forEach(cfg => {
        const el = document.querySelector(`.point-${cfg.idx}`)
        if(el) el.dataset.state = states[cfg.id] || 'neutral'
    })
}

// ── Fetch + refresh ──────────────────────────────────────────────────────────
export const refreshBrief = (POINTS) =>
    Promise.all([
        fetch('/api/brief')
            .then(res => { if(!res.ok) throw new Error(res.status); return res.json() }),
        fetch('/api/rotation/liquidity/latest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
    ])
        .then(([briefJson, liqJson]) => {
            briefData = briefJson
            if(liqJson && Array.isArray(liqJson.rows)) liqFullRows = liqJson.rows
            populateBrief(briefJson, POINTS)
            computePointStates(briefJson, POINTS)
        })
        .catch(() => {
            document.querySelectorAll('.point .text').forEach(el => {
                el.textContent = 'Data unavailable.'
            })
        })
