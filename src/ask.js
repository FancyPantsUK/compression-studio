import { briefData } from './state/store.js'
import { pct, issueDate, priorDate } from './utils.js'
import { REPORT_TEMPLATES } from './data/templates.js'

// ── Layer B: Interpretation (MIT-governed) ──────────────────────────────────
import {
    getRegime, getPrimaryDriver, getDrivers, getExpressions,
    getRisks, getSummary, getWhatChanged, getIssueDates
} from './state/interpretation.js'

// ── Layer A: Measurements (upload-governed) ─────────────────────────────────
import {
    getLiquidityState, getIndustryBreadth, getMasterBreadth
} from './state/measurements.js'

/**
 * Ask MIT — quick + report mode, presets, streaming SSE
 */
export const initAsk = () => {
    const askToggle  = document.getElementById('askToggle')
    const askPanel   = document.getElementById('askPanel')
    const askInput   = document.getElementById('askInput')
    const askSubmit  = document.getElementById('askSubmit')
    const askClose   = document.getElementById('askClose')
    const askAnswer  = document.getElementById('askAnswer')
    const askSources = document.getElementById('askSources')
    const modeQuick      = document.getElementById('modeQuick')
    const modeReport     = document.getElementById('modeReport')
    const presetToggle   = document.getElementById('presetToggle')
    const askPresets     = document.getElementById('askPresets')

    let askMode = 'quick'

    const setMode = (mode) => {
        askMode = mode
        if(mode === 'report') {
            modeReport.classList.add('active')
            modeQuick.classList.remove('active')
            askInput.placeholder = 'Report topic — uses full brief + rotation context…'
        } else {
            modeQuick.classList.add('active')
            modeReport.classList.remove('active')
            askInput.placeholder = 'Ask a focused macro question…'
        }
    }

    modeQuick.addEventListener('click',  () => setMode('quick'))
    modeReport.addEventListener('click', () => setMode('report'))

    presetToggle.addEventListener('click', () => {
        askPresets.classList.toggle('open')
        presetToggle.classList.toggle('active')
    })

    // ── Quick mode brief framing ─────────────────────────────────────────────
    const buildQuickContext = (q) => {
        if(!briefData) return q
        // Layer B: Interpretation
        const regime = getRegime(briefData)
        const d0     = getPrimaryDriver(briefData)
        return `[MIT context: ${regime.view.split('.')[0]}. Primary driver: ${d0}]\n\n${q}`
    }

    // ── Full rotation context builder ────────────────────────────────────────
    const buildReportContext = () => {
        if(!briefData) return ''
        const bd = briefData

        // Layer B: Interpretation (MIT)
        const regime  = getRegime(bd)
        const summ    = getSummary(bd)
        const wc      = getWhatChanged(bd)
        const drivers = getDrivers(bd)
        const exprs   = getExpressions(bd)
        const risks   = getRisks(bd)
        const dates   = getIssueDates(bd)

        // Layer A: Measurements (uploads)
        const liq = getLiquidityState(bd)
        const ind = getIndustryBreadth(bd)
        const mst = getMasterBreadth(bd)

        const liqL1w = liq.topBy1w.slice(0, 5).filter(r => r.key).map(r => `${r.key} ${pct(r['1w'])}`).join(', ')
        const liqL1m = liq.topBy1m.slice(0, 3).filter(r => r.key).map(r => `${r.key} ${pct(r['1m'])}`).join(', ')
        const indL1w = ind.topBy1w.slice(0, 5).filter(r => r.key || r.name).map(r => `${r.key || r.name} ${pct(r['1w'])}`).join(', ')
        const indL1m = ind.topBy1m.slice(0, 3).filter(r => r.key || r.name).map(r => `${r.key || r.name} ${pct(r['1m'])}`).join(', ')
        const mstL1m = mst.topBy1m.slice(0, 5).filter(r => r.key).map(r => `${r.key} ${pct(r['1m'], 0)}`).join(', ')
        const mstL3m = mst.topBy3m.slice(0, 3).filter(r => r.key).map(r => `${r.key} ${pct(r['3m'], 0)}`).join(', ')

        const hasLiq = !!(liq.state || liqL1w)
        const hasInd = !!(ind.takeaway || indL1w)
        const hasMst = !!(mst.rankingSummary || mstL1m)

        const liqSection = hasLiq ? [
            '',
            `=== Uploaded Liquidity Snapshot ===`,
            liq.state ? `State: ${liq.state}` : null,
            typeof liq.avg1m === 'number' ? `Avg returns — 1d: ${pct(liq.avg1d)}, 1m: ${pct(liq.avg1m)}, 3m: ${pct(liq.avg3m)}` : null,
            liqL1w ? `Leaders 1w: ${liqL1w}` : null,
            liqL1m ? `Leaders 1m: ${liqL1m}` : null,
        ] : [``, `=== Uploaded Liquidity Snapshot: not yet loaded ===`]

        const indSection = hasInd ? [
            '',
            `=== Uploaded Industry Rotation Snapshot ===`,
            ind.takeaway ? `Takeaway: ${ind.takeaway}` : null,
            indL1w ? `Leaders 1w: ${indL1w}` : null,
            indL1m ? `Leaders 1m: ${indL1m}` : null,
            ind.b1w.pct !== undefined ? `Breadth 1w: ${ind.b1w.pct}%` : null,
            ind.b1m.pct !== undefined ? `Breadth 1m: ${ind.b1m.pct}%` : null,
        ] : [``, `=== Uploaded Industry Rotation Snapshot: not yet loaded ===`]

        const mstSection = hasMst ? [
            '',
            `=== Uploaded Master Leadership Snapshot ===`,
            mst.rankingSummary ? `Summary: ${mst.rankingSummary}` : null,
            mstL1m ? `Leaders 1m: ${mstL1m}` : null,
            mstL3m ? `Leaders 3m: ${mstL3m}` : null,
            mst.b1m.pct !== undefined ? `Breadth 1m: ${mst.b1m.pct}%` : null,
            mst.b3m.pct !== undefined ? `Breadth 3m: ${mst.b3m.pct}%` : null,
        ] : [``, `=== Uploaded Master Leadership Snapshot: not yet loaded ===`]

        return [
            `=== MIT Brief: ${issueDate(dates.current)} vs ${priorDate(dates.previous)} prior ===`,
            `Regime: ${regime.view}`,
            `Summary: ${summ}`,
            `What changed: ${wc.text}`,
            `Key drivers: ${drivers.join('; ')}`,
            `Best expressions: ${exprs.join('; ')}`,
            `Risks: ${risks.join('; ')}`,
            ...liqSection,
            ...indSection,
            ...mstSection,
        ].filter(s => s !== null).join('\n')
    }

    const buildReportPrompt = (question) => {
        const ctx = buildReportContext()
        if(!ctx) return question
        const template = REPORT_TEMPLATES[question]
        if(template) return template(ctx)
        return `${ctx}\n\nWrite a structured MIT-style macro report on: ${question}.\n` +
            `Sections: 1) Thesis — confirm or weaken based on current data. ` +
            `2) Evidence — key supporting numbers from the uploaded rotation snapshots. ` +
            `3) Best Expressions — specific actionable trades. ` +
            `4) What to Watch — forward triggers and risks.\n` +
            `Be specific. Use numbers from the uploaded snapshots. The report must materially reflect the rotation data.`
    }

    askToggle.addEventListener('click', () => { askPanel.classList.toggle('open') })
    askClose.addEventListener('click',  () => { askPanel.classList.remove('open') })

    const fmtSources = (srcs) =>
        (srcs || []).slice(0, 3).map(s => `${s.source_file} p${s.page_number}`).join('  ·  ')

    const submitAsk = () => {
        const q = askInput.value.trim()
        if(!q) return

        askAnswer.textContent  = askMode === 'report' ? 'Generating…' : 'Searching MIT research…'
        askAnswer.classList.add('streaming')
        askSources.textContent = ''
        askSubmit.disabled     = true

        if(askMode === 'report') {
            fetch('/api/ask/stream', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ question: buildReportPrompt(q), limit: 8, report: true })
            })
            .then(res => { if(!res.ok) throw new Error(res.status); return res.body.getReader() })
            .then(reader => {
                let firstChunk = true
                const dec = new TextDecoder()
                let buf   = ''

                const pump = () => reader.read().then(({ done, value }) => {
                    if(done) { askAnswer.classList.remove('streaming'); askSubmit.disabled = false; return }
                    buf += dec.decode(value, { stream: true })
                    const parts = buf.split('\n\n')
                    buf = parts.pop()
                    for(const part of parts) {
                        if(!part.startsWith('data: ')) continue
                        const raw = part.slice(6).trim()
                        if(raw === '[DONE]') { askAnswer.classList.remove('streaming'); askSubmit.disabled = false; return }
                        try {
                            const evt = JSON.parse(raw)
                            if(evt.t === 'c') {
                                if(firstChunk) { askAnswer.textContent = ''; firstChunk = false }
                                askAnswer.textContent += evt.v
                            }
                            else if(evt.t === 's') askSources.textContent = fmtSources(evt.v)
                        } catch {}
                    }
                    return pump()
                })
                return pump()
            })
            .catch(() => {
                askAnswer.classList.remove('streaming')
                askAnswer.textContent = 'Unavailable.'
                askSubmit.disabled    = false
            })
        } else {
            fetch('/api/ask', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ question: buildQuickContext(q), limit: 4, report: false })
            })
            .then(res => { if(!res.ok) throw new Error(res.status); return res.json() })
            .then(data => {
                askAnswer.classList.remove('streaming')
                askAnswer.textContent  = data.answer || '—'
                askSources.textContent = fmtSources(data.sources)
            })
            .catch(() => { askAnswer.classList.remove('streaming'); askAnswer.textContent = 'Unavailable.' })
            .finally(() => { askSubmit.disabled = false })
        }
    }

    askSubmit.addEventListener('click', submitAsk)
    askInput.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAsk() }
    })

    askPresets.querySelectorAll('.preset-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            setMode(pill.dataset.mode || 'quick')
            askInput.value = pill.dataset.q
            askPresets.classList.remove('open')
            presetToggle.classList.remove('active')
            submitAsk()
        })
    })
}
