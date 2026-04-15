import * as THREE from 'three'
import { PLAYBOOK_CLUSTERS } from '../data/clusters.js'
import { SIGNAL_PAIRS } from '../data/signals.js'
import { RED_FLAGS, GREEN_FLAGS, STRUCTURAL_RISKS } from '../data/risks.js'
import { setText, setHtml, strip, pct, issueDate, priorDate } from '../utils.js'
import {
    cap, liqGrid, breadthSection, investmentCommandsPb,
    clusterGridPb, momentumTablePb, riskPanelPb, ratioTable
} from '../renderers/components.js'
import { createContract } from '../renderers/contract.js'
import { renderContract, registerSectionRenderer } from '../renderers/contractRenderer.js'

// ── Layer A: Measurements (upload-governed) ─────────────────────────────────
import {
    getLiquidityState, getIndustryBreadth, getMasterBreadth,
    getRotationTimestamp, getLiquidityRows, findPairRow, getSignalPairStatus,
    enrichRedFlags, enrichGreenFlags, buildWatchlistRows
} from '../state/measurements.js'

// ── Layer B: Interpretation (MIT-governed) ──────────────────────────────────
import {
    getRegime, getPrimaryDriver, getDrivers, getExpressions,
    getRisks, getSummary, getWhatChanged, getIssueDates
} from '../state/interpretation.js'

// ── Section renderers ───────────────────────────────────────────────────────
registerSectionRenderer('regimeGrid', (data) => {
    const cell = (label, value, sub, cls) =>
        `<div class="liq-card">` +
        `<div class="liq-value${cls || ''}">${value}</div>` +
        `<div class="liq-sub">${sub}</div>` +
        `<div class="liq-label">${label}</div>` +
        `</div>`
    return (
        `<div class="pb-section">` +
        `<div class="pb-section-label">${data.label}</div>` +
        `<div class="liq-grid">` +
        data.cells.map(c => cell(c.label, c.value, c.sub, c.cls)).join('') +
        `</div>` +
        (data.barsHtml || '') +
        `</div>`
    )
})

registerSectionRenderer('investmentCommands', (data) => {
    return (
        `<div class="pb-section">` +
        `<div class="pb-section-label">${data.label}</div>` +
        investmentCommandsPb(data.cards) +
        `</div>`
    )
})

registerSectionRenderer('signalPairsTable', (data) => {
    return (
        `<div class="pb-section">` +
        `<div class="pb-section-label">${data.label}</div>` +
        data.tableHtml +
        `</div>`
    )
})

registerSectionRenderer('liqGridSection', (data) => {
    return (
        `<div class="pb-section">` +
        `<div class="pb-section-label">${data.label}</div>` +
        liqGrid(data.cells) +
        (data.breadthRows && data.breadthRows.length ? breadthSection(data.breadthRows) : '') +
        `</div>`
    )
})

registerSectionRenderer('momentumTable', (data) => {
    return (
        `<div class="pb-section">` +
        `<div class="pb-section-label">${data.label}</div>` +
        momentumTablePb(data.rows) +
        `</div>`
    )
})

registerSectionRenderer('clusterGrid', (data) => {
    return (
        `<div class="pb-section">` +
        `<div class="pb-section-label">${data.label}</div>` +
        clusterGridPb(data.clusters) +
        `</div>`
    )
})

registerSectionRenderer('riskPanel', (data) => riskPanelPb(data.redItems, data.greenItems))

registerSectionRenderer('ratioWatchlist', (data) => {
    return (
        `<div class="pb-section">` +
        `<div class="pb-section-label">${data.label || 'Weekly watchlist'}</div>` +
        ratioTable(data.rows) +
        `</div>`
    )
})

registerSectionRenderer('structuralRiskGrid', (data) => {
    const scenarioCard = (s) =>
        `<div class="struct-risk-card struct-risk-card--${s.severity}">` +
        `<div class="struct-risk-n">${s.n}</div>` +
        `<div class="struct-risk-body">` +
        `<div class="struct-risk-title">${s.title}</div>` +
        `<div class="struct-risk-desc">${s.desc}</div>` +
        `</div>` +
        `</div>`

    const leftCol  = data.risks.slice(0, 3)
    const rightCol = data.risks.slice(3)
    return (
        `<div class="struct-risk-grid">` +
        `<div class="struct-risk-col">${leftCol.map(scenarioCard).join('')}</div>` +
        `<div class="struct-risk-col">${rightCol.map(scenarioCard).join('')}</div>` +
        `</div>`
    )
})

/**
 * Points config — 8-step numbered sequence
 * id        — step number string ('1'–'8')
 * idx       — DOM class bridge (.point-N)
 * clickable — whether label fires detail panel
 * route     — POST endpoint; null = use briefData directly
 * title     — detail panel header
 * position  — THREE.Vector3 on the model surface
 * populate  — fills hover text node from brief/rotation data
 * render    — returns detail panel HTML string; null = hover-only
 */
export const POINTS = [
    {
        id: '1', idx: 0, clickable: true, route: null, title: '01 · Regime State',
        position: new THREE.Vector3(1.5, 1.7, - 0.6),
        populate: (d) =>
        {
            // Layer B: Interpretation
            const regime = getRegime(d)
            const driver = getPrimaryDriver(d)
            const wc     = getWhatChanged(d)
            setHtml('.point-0 .text',
                `${regime.view.split('.')[0]}<br>` +
                `<span class="point-meta">${driver}</span><br>` +
                `<span class="point-meta">Δ ${wc.text.split('.')[0]}</span>`)
        },
        render: (data) =>
        {
            // Layer B: Interpretation (MIT)
            const regime = getRegime(data)
            const d0     = getPrimaryDriver(data)

            // Layer A: Measurements (uploads)
            const liq    = getLiquidityState(data)
            const ind    = getIndustryBreadth(data)
            const liqRows = getLiquidityRows(data)

            const uupRow  = findPairRow(liqRows, ['uup:spy', 'uup'])
            const eemRow  = findPairRow(liqRows, ['eem:spy', 'eem'])
            const soxxRow = findPairRow(liqRows, ['soxx:qqq', 'soxx'])

            const ismBreadthVal = ind.b1w.pct !== undefined ? `${ind.b1w.pct}%` : '—'
            const ismSub        = ind.b1w.pct !== undefined ? 'ind breadth proxy' : 'upload industry'

            const regimeVal = regime.isExpansion ? 'Expansion' : regime.isCaution ? 'Contraction' : 'Neutral'
            const regimeSub = regime.isExpansion ? 'risk-on confirmed' : regime.isCaution ? 'risk-off elevated' : 'mixed signals'
            const regimeCls = regime.isExpansion ? ' pos' : regime.isCaution ? ' neg' : ''

            const fedLiqVal = liq.state ? liq.state.split(' ').slice(0, 2).join(' ') : '—'
            const fedLiqSub = liq.state ? liq.state.split(' ').slice(2, 5).join(' ') || 'net liquidity' : 'upload liquidity'
            const fedLiqCls = liq.isExpanding ? ' pos' : liq.isContracting ? ' neg' : ''

            const ismCls = ind.b1w.pct !== undefined ? ind.b1w.pct >= 55 ? ' pos' : ind.b1w.pct < 40 ? ' neg' : ' warn' : ''

            const mb1wVal = ind.b1w.pct !== undefined ? `${ind.b1w.pct}%` : '—'
            const mb1wSub = ind.b1w.count !== undefined ? `${ind.b1w.count}/${ind.b1w.total} positive` : 'upload industry'
            const mb1wCls = ind.b1w.pct !== undefined ? ind.b1w.pct >= 55 ? ' pos' : ind.b1w.pct < 40 ? ' neg' : ' warn' : ''

            const mb1mVal = ind.b1m.pct !== undefined ? `${ind.b1m.pct}%` : '—'
            const mb1mSub = ind.b1m.count !== undefined ? `${ind.b1m.count}/${ind.b1m.total} positive` : 'upload industry'
            const mb1mCls = ind.b1m.pct !== undefined ? ind.b1m.pct >= 55 ? ' pos' : ind.b1m.pct < 40 ? ' neg' : ' warn' : ''

            const uupVal = uupRow ? pct(uupRow['1w']) : '—'
            const uupSub = uupRow ? (typeof uupRow['1m'] === 'number' ? `1m ${pct(uupRow['1m'])}` : '1m —') : 'dollar strength signal'
            const uupCls = uupRow ? ((uupRow['1w'] || 0) < 0 ? ' pos' : (uupRow['1w'] || 0) > 0 ? ' neg' : '') : ''

            const eemVal = eemRow ? pct(eemRow['1w']) : '—'
            const eemSub = eemRow ? (typeof eemRow['1m'] === 'number' ? `1m ${pct(eemRow['1m'])}` : '1m —') : 'EM vs US breadth'
            const eemCls = eemRow ? ((eemRow['1w'] || 0) > 0 ? ' pos' : (eemRow['1w'] || 0) < 0 ? ' neg' : '') : ''

            const soxxVal = soxxRow ? pct(soxxRow['1w']) : '—'
            const soxxSub = soxxRow ? (typeof soxxRow['1m'] === 'number' ? `1m ${pct(soxxRow['1m'])}` : '1m —') : 'semis vs tech'
            const soxxCls = soxxRow ? ((soxxRow['1w'] || 0) > 0 ? ' pos' : (soxxRow['1w'] || 0) < 0 ? ' neg' : '') : ''

            const gridCells = [
                { label: 'Regime',               value: regimeVal, sub: regimeSub, cls: regimeCls },
                { label: 'Fed Net Liquidity',     value: fedLiqVal, sub: fedLiqSub, cls: fedLiqCls },
                { label: 'ISM Breadth',           value: ismBreadthVal, sub: ismSub, cls: ismCls },
                { label: 'Market Breadth (1W)',   value: mb1wVal,   sub: mb1wSub,   cls: mb1wCls },
                { label: 'Market Breadth (1M)',   value: mb1mVal,   sub: mb1mSub,   cls: mb1mCls },
                { label: 'USD (UUP:SPY)',         value: uupVal,    sub: uupSub,    cls: uupCls },
                { label: 'EM vs US (EEM:SPY)',    value: eemVal,    sub: eemSub,    cls: eemCls },
                { label: 'Semis vs QQQ',          value: soxxVal,   sub: soxxSub,   cls: soxxCls },
            ]

            const barsHtml = (ind.b1w.pct !== undefined || ind.b1m.pct !== undefined)
                ? `<div class="breadth-section">` +
                  (ind.b1w.pct !== undefined
                      ? `<div class="breadth-row">` +
                        `<span class="breadth-row-label">Market Breadth 1W</span>` +
                        `<div class="breadth-bar"><div class="breadth-fill" style="width:${ind.b1w.pct}%"></div></div>` +
                        `<span class="breadth-pct">${ind.b1w.count || '—'}/${ind.b1w.total || '—'}</span>` +
                        `</div>` : '') +
                  (ind.b1m.pct !== undefined
                      ? `<div class="breadth-row">` +
                        `<span class="breadth-row-label">Market Breadth 1M</span>` +
                        `<div class="breadth-bar"><div class="breadth-fill" style="width:${ind.b1m.pct}%"></div></div>` +
                        `<span class="breadth-pct">${ind.b1m.count || '—'}/${ind.b1m.total || '—'}</span>` +
                        `</div>` : '') +
                  `</div>` : ''

            return renderContract(createContract({
                id:    '1',
                label: '01 · Regime State',
                title: 'Regime State',

                state:       regime.badgeText,
                signal:      d0 || regime.view.split('.')[0] || '—',
                implication: `${cap(regime.view.split('.')[0], 20) || '—'}.`,
                risk:        regime.isCaution ? 'Risk-off elevated' : null,
                whatChanges: 'Regime view shift or breadth collapse',

                headline:    d0 || regime.view.split('.')[0] || '—',
                badgeText:   regime.badgeText,
                badgeType:   regime.badgeType,

                introTitle:  'Where We Are In The Cycle',
                introProse:  `${cap(regime.view.split('.')[0], 20) || '—'}.`,

                sections: [
                    { type: 'regimeGrid', data: { label: 'State matrix', cells: gridCells, barsHtml } },
                ],

                smallNote: '1W breadth is more volatile — use 1M for trend confirmation. USD (UUP:SPY) inverts: falling = bullish for risk assets.',

                dominoFwd: 'Regime confirmed — see Investment Commands (02) for position framing.',
            }))
        }
    },
    {
        id: '2', idx: 1, clickable: true, route: null, title: '02 · Investment Commands',
        position: new THREE.Vector3(2.0, 0.8, - 0.6),
        populate: (d) =>
        {
            // Layer B: Interpretation
            const regime = getRegime(d)
            const e0 = (getExpressions(d)[0] || '').split('.')[0]
            setHtml('.point-1 .text',
                `${regime.view.split('.')[0]}<br>` +
                (e0 ? `<span class="point-meta">${e0}</span>` : ''))
        },
        render: (data) =>
        {
            // Layer B: Interpretation (MIT)
            const regime  = getRegime(data)
            const rv      = regime.view
            const summ    = getSummary(data)
            const wc      = getWhatChanged(data)
            const changed = wc.text
            const noRev   = wc.noReversal
            const drivers = getDrivers(data).slice(0, 3)
            const d0      = drivers[0] || ''
            const exprs   = getExpressions(data)
            const risks   = getRisks(data).slice(0, 3)
            const e0 = exprs[0] || ''
            const e1 = exprs[1] || ''
            const r0 = risks[0] || ''
            const r1 = risks[1] || ''
            const r2 = risks[2] || ''

            const isExp  = regime.isExpansion
            const isCaut = regime.isCaution
            const bias   = isExp ? 'Long risk' : isCaut ? 'Reduce / hedge' : 'Neutral'

            const conf1m = isExp && noRev ? 8 : isCaut ? 3 : 5
            const conf3m = isExp ? 6 : isCaut ? 4 : 5
            const conf9m = isExp ? 5 : isCaut ? 4 : 5

            const regimeStr1m = isExp ? 'Expansion' : isCaut ? 'Contraction' : 'Neutral'
            const regimeStr3m = isExp ? 'Expansion' : isCaut ? 'Contraction' : 'Transitional'
            const regimeStr9m = isExp ? 'Bull / expansion' : isCaut ? 'Bear / contraction' : 'Neutral / cycle'

            const stab1m  = noRev ? 'Stable' : 'Shifting'
            const drift1m = isExp ? 'Cyclical outperformance' : isCaut ? 'Defensive rotation' : 'Range-bound'
            const confTxt = changed ? cap(changed.split('.')[0], 10) : 'No shift this issue'

            const cards = [
                {
                    horizon:    '1M · Tactical',
                    directive:  cap(e0.split('.')[0] || rv.split('.')[0] || '—', 12),
                    confidence: conf1m,
                    fields: [
                        { k: 'regime',           v: regimeStr1m },
                        { k: 'dominant_driver',  v: cap(d0.split('.')[0], 8) || '—' },
                        { k: 'bias',             v: bias },
                        { k: 'expression',       v: cap(e0.split('.')[0], 8) || '—' },
                        { k: 'avoid',            v: cap(r0.split('.')[0], 8) || '—' },
                        { k: 'size',             v: isExp && noRev ? 'Full' : isCaut ? 'Reduced' : 'Half' },
                        { k: 'horizon',          v: '1M tactical' },
                        { k: 'risk',             v: cap(r0.split('.')[0], 7) || 'Monitor weekly' },
                        { k: 'regime_stability', v: stab1m },
                        { k: 'drift',            v: cap(drift1m, 6) },
                        { k: 'confirmation',     v: confTxt },
                        { k: 'confidence',       v: `${conf1m}/10` },
                    ],
                    cohere:  changed ? cap(changed.split('.')[0], 15) : 'No driver shift detected this issue.',
                    compass: noRev
                        ? `Thesis intact — act on ${cap(e0.split(' ').slice(0, 4).join(' ') || 'primary expression', 6)}.`
                        : 'Thesis under review — hold size, do not add.',
                },
                {
                    horizon:    '3M · Intermediate',
                    directive:  cap(rv.split('.')[0] || '—', 12),
                    confidence: conf3m,
                    fields: [
                        { k: 'regime',           v: regimeStr3m },
                        { k: 'dominant_driver',  v: cap((drivers[1] || d0).split('.')[0], 8) || '—' },
                        { k: 'bias',             v: bias },
                        { k: 'expression',       v: cap((e1 || e0).split('.')[0], 8) || '—' },
                        { k: 'avoid',            v: cap((r1 || r0).split('.')[0], 8) || '—' },
                        { k: 'size',             v: isExp ? 'Plan weight' : 'Underweight' },
                        { k: 'horizon',          v: '3M intermediate' },
                        { k: 'risk',             v: cap((r1 || r0).split('.')[0], 7) || 'See watchlist' },
                        { k: 'regime_stability', v: isExp ? 'Trending' : 'Uncertain' },
                        { k: 'drift',            v: isExp ? 'Cyclical leadership' : 'Defensive drift' },
                        { k: 'confirmation',     v: cap(summ ? summ.split('.')[0] : d0, 10) || '—' },
                        { k: 'confidence',       v: `${conf3m}/10` },
                    ],
                    cohere:  cap(summ ? summ.split('.')[0] : rv.split('.')[0], 15),
                    compass: isExp
                        ? 'Structure favours cyclical. Build through dips.'
                        : 'Structure uncertain — hold and monitor.',
                },
                {
                    horizon:    '9M · Strategic',
                    directive:  cap(summ ? summ.split('.')[0] : rv.split('.')[0] || '—', 12),
                    confidence: conf9m,
                    fields: [
                        { k: 'regime',           v: regimeStr9m },
                        { k: 'dominant_driver',  v: cap(d0.split('.')[0], 8) || '—' },
                        { k: 'bias',             v: isExp ? 'Long risk assets' : 'Capital preservation' },
                        { k: 'expression',       v: cap((exprs[2] || e1 || e0).split('.')[0], 8) || '—' },
                        { k: 'avoid',            v: cap((r2 || r0).split('.')[0], 8) || '—' },
                        { k: 'size',             v: isExp ? 'Strategic weight' : 'Defensive' },
                        { k: 'horizon',          v: '9M strategic' },
                        { k: 'risk',             v: cap((r2 || r0).split('.')[0], 7) || 'Structural watch' },
                        { k: 'regime_stability', v: 'Multi-cycle view' },
                        { k: 'drift',            v: isExp ? 'Secular bull intact' : 'Transition watch' },
                        { k: 'confirmation',     v: d0 ? cap(d0.split('.')[0], 10) : 'MIT structural case' },
                        { k: 'confidence',       v: `${conf9m}/10` },
                    ],
                    cohere:  d0 ? `Structural driver: ${cap(d0.split('.')[0], 10)}` : 'Structural case supported by MIT research.',
                    compass: 'Strategic horizon — reassess when regime view changes materially.',
                },
            ]

            const badgeText = isExp ? 'Risk-On' : isCaut ? 'Risk-Off' : 'Neutral'
            const badgeType = isExp ? 'bull' : isCaut ? 'bear' : 'neutral'

            return renderContract(createContract({
                id:    '2',
                label: '02 · Investment Commands',
                title: 'Investment Commands',

                state:       badgeText,
                signal:      cap(rv.split('.')[0] || '—', 10),
                implication: bias,
                expression:  exprs.slice(0, 3),
                risk:        r0 || null,
                whatChanges: changed ? cap(changed.split('.')[0], 15) : 'No shift this issue',

                headline:    cap(rv.split('.')[0] || '—', 10),
                badgeText,
                badgeType,

                introTitle:  'Playbook Across Horizons',
                introProse:  'Position sizing and directional commands across tactical, intermediate, and strategic time horizons.',

                sections: [
                    { type: 'investmentCommands', data: { label: 'Horizon command cards — 1M · 3M · 9M', cards } },
                ],

                dominoFwd: 'Commands set. Confirm via Sector Clusters (03) and Liquidity Signals (05) before sizing.',
            }))
        }
    },
    {
        id: '3', idx: 2, clickable: true, route: '/api/rotation/industry/latest', title: '03 · Sector Clusters To Own',
        emptyMsg: 'No industry snapshot loaded. Upload the industry HTML via the Upload panel to populate this step.',
        position: new THREE.Vector3(0.5, 1.5, - 1.8),
        populate: (d) =>
        {
            // Layer A: Measurements
            const ind = getIndustryBreadth(d)
            if(ind.takeaway || ind.topBy1w.length)
            {
                const top  = ind.topBy1w[0] || {}
                const b1w  = ind.b1w.pct
                const line = strip((ind.takeaway || '').split('. ')[0])
                setHtml('.point-2 .text',
                    `${line || 'Sector rotation'}<br>` +
                    `<span class="point-meta">${top.key ? top.key + ' ' + pct(top['1w']) : ''}</span><br>` +
                    `<span class="point-meta">Breadth 1w: ${b1w !== undefined ? b1w + '%' : '—'}</span>`)
            }
            else setText('.point-2 .text', 'Upload industry snapshot')
        },
        render: (data) =>
        {
            // Layer A: Measurements (uploads — direct from fetch)
            const tops1w = data.top_by_1w || []
            const tops1m = data.top_by_1m || []
            const b1w    = ((data.breadth || {})['1w'] || {}).pct_positive
            const line   = strip(data.expression_takeaway || '')
            const asOf   = data.as_of || data.saved_at || ''

            const leadKeys = new Set([
                ...tops1w.map(r => (r.key || '').toUpperCase()),
                ...tops1m.map(r => (r.key || '').toUpperCase()),
            ])

            const buildCluster = (def) => ({
                label: `${def.icon} ${def.label}`,
                chips: def.tickers.map(t => ({
                    text: t,
                    type: leadKeys.has(t) ? 'lead' : def.type,
                }))
            })

            const ownClusters     = PLAYBOOK_CLUSTERS.slice(0, 6).map(buildCluster)
            const specialClusters = PLAYBOOK_CLUSTERS.slice(6).map(buildCluster)

            const verdictTxt   = b1w !== undefined ? b1w >= 55 ? 'Confirming' : b1w < 40 ? 'Narrow' : 'Mixed' : '—'
            const verdictBadge = verdictTxt === 'Confirming' ? 'bull' : verdictTxt === 'Narrow' ? 'bear' : 'neutral'

            const headLine = b1w !== undefined
                ? verdictTxt === 'Confirming' ? `Cyclicals leading — ${b1w}% breadth`
                : verdictTxt === 'Narrow'     ? `Breadth narrow — ${b1w}% positive 1w`
                : `Mixed rotation — ${b1w}% breadth 1w`
                : 'Awaiting industry snapshot'

            return renderContract(createContract({
                id:    '3',
                label: '03 · Sector Clusters To Own',
                title: 'Sector Clusters To Own',

                state:       verdictTxt || null,
                signal:      headLine,
                implication: line ? cap(line.split('.')[0], 15) : null,
                expression:  tops1w.slice(0, 5).map(r => r.key).filter(Boolean),
                risk:        b1w !== undefined && b1w < 40 ? `Breadth narrow (${b1w}%)` : null,
                whatChanges: 'Breadth dropping below 40% or leadership narrowing',

                headline:    headLine,
                badgeText:   verdictTxt || null,
                badgeType:   verdictBadge,

                introTitle:  'Where To Concentrate',
                introProse:  'Named playbook clusters and their current leadership status. Gold chips = confirmed by upload data.',

                compassQuote: line ? cap(line.split('.')[0], 15) : null,
                compassLabel: line ? 'Rotation takeaway' : null,

                sections: [
                    { type: 'clusterGrid', data: { label: 'Own — cyclical & growth clusters', clusters: ownClusters } },
                    { type: 'clusterGrid', data: { label: 'Special handling — avoid · watch · defensive', clusters: specialClusters } },
                ],

                dominoGate: 'Gate: regime confirming',
                dominoFwd: b1w !== undefined
                    ? b1w >= 55
                        ? `Sector clusters active — proceed to Momentum Leaders (04).`
                        : `Breadth thin (${b1w}%) — check Momentum (04) before sizing clusters.`
                    : 'Upload industry snapshot to read cluster leadership.',

                footerNote: asOf ? `as of ${asOf}` : null,
            }))
        }
    },
    {
        id: '4', idx: 3, clickable: true, route: '/api/rotation/master/latest', title: '04 · Momentum & Persistence Leaders',
        emptyMsg: 'No master snapshot loaded. Upload the master HTML via the Upload panel to populate this step.',
        position: new THREE.Vector3(2.1, - 0.2, - 0.8),
        populate: (d) =>
        {
            // Layer A: Measurements
            const mst = getMasterBreadth(d)
            if(mst.topBy1m.length || mst.topBy3m.length)
            {
                const m1  = mst.topBy1m[0] || {}
                const m3  = mst.topBy3m[0] || {}
                const b1m = mst.b1m.pct
                setHtml('.point-3 .text',
                    `1m: ${m1.key || '—'} ${pct(m1['1m'], 0)}<br>` +
                    `<span class="point-meta">3m: ${m3.key || '—'} ${pct(m3['3m'], 0)}</span><br>` +
                    `<span class="point-meta">${b1m !== undefined ? b1m + '% positive' : ''}</span>`)
            }
        },
        render: (data) =>
        {
            const rawRows   = data.rows || data.top_by_1m || []
            const tableRows = [...rawRows]
                .sort((a, b) => (b['1m'] ?? -Infinity) - (a['1m'] ?? -Infinity))
                .slice(0, 15)
            const b1m      = ((data.breadth || {})['1m'] || {}).pct_positive
            const b3m      = ((data.breadth || {})['3m'] || {}).pct_positive
            const asOf     = data.as_of || data.saved_at || ''

            const persCount = tableRows.filter(r =>
                typeof r['1m'] === 'number' && r['1m'] > 0 &&
                typeof r['3m'] === 'number' && r['3m'] > 0
            ).length
            const persTotal = tableRows.filter(r =>
                typeof r['1m'] === 'number' && typeof r['3m'] === 'number'
            ).length

            const healthTxt = b1m !== undefined
                ? b1m >= 60 ? 'High Conviction' : b1m >= 40 ? 'Moderate' : 'Low Conviction'
                : '—'
            const healthCls = b1m !== undefined ? b1m >= 60 ? ' pos' : b1m < 40 ? ' neg' : ' warn' : ''
            const topKey = (tableRows[0] || {}).key || (tableRows[0] || {}).name || null

            const ldrHeadline = b1m !== undefined
                ? `${healthTxt} — ${b1m}% positive 1m`
                : 'Momentum & persistence leaders'

            const statCells = [
                { label: 'Breadth 1m',  value: b1m !== undefined ? b1m + '%' : '—', cls: healthCls },
                { label: 'Breadth 3m',  value: b3m !== undefined ? b3m + '%' : '—', cls: b3m !== undefined ? b3m >= 55 ? ' pos' : b3m < 40 ? ' neg' : ' warn' : '' },
                { label: 'Persistence', value: persTotal > 0 ? `${persCount}/${persTotal}` : '—', cls: persTotal > 0 && persCount / persTotal >= 0.6 ? ' pos' : '' },
                { label: 'Top Leader',  value: topKey || '—', cls: ' pos' },
            ]

            const breadthRows = [
                b1m !== undefined ? { label: 'Master 1m', pct: b1m } : null,
                b3m !== undefined ? { label: 'Master 3m', pct: b3m } : null,
            ].filter(Boolean)

            return renderContract(createContract({
                id:    '4',
                label: '04 · Momentum & Persistence Leaders',
                title: 'Momentum & Persistence Leaders',

                state:       healthTxt,
                signal:      ldrHeadline,
                implication: b1m !== undefined && b1m >= 55 ? 'Leadership confirms theme' : 'Leadership mixed — hold sizing',
                expression:  tableRows.slice(0, 5).map(r => r.key || r.name).filter(Boolean),
                risk:        b1m !== undefined && b1m < 40 ? `Low conviction (${b1m}% 1m)` : null,
                whatChanges: 'Breadth dropping below 40% or persistence breaking',

                headline:    ldrHeadline,
                badgeText:   healthTxt,
                badgeType:   b1m !== undefined ? b1m >= 60 ? 'bull' : b1m < 40 ? 'bear' : 'neutral' : 'neutral',

                introTitle:  'Tickers Showing Sustained Strength',
                introProse:  'Master list leaders ranked by 1M momentum. Persistence shows how many timeframes are positive.',

                sections: [
                    { type: 'liqGridSection', data: { label: 'Breadth snapshot', cells: statCells, breadthRows } },
                    { type: 'momentumTable', data: { label: 'Leaders — 1M · 3M · 6M · YTD · 1Y · Persistence', rows: tableRows } },
                ],

                smallNote: 'Persistence = number of timeframes with positive return. Leaders showing ≥4/5 are high-conviction.',

                dominoGate: 'Gate: rotation breadth positive',
                dominoFwd: b1m !== undefined
                    ? b1m >= 55
                        ? `Leadership confirms theme — proceed to Liquidity Signals (05).`
                        : `Leadership mixed (${b1m}% 1m) — hold current sizing, do not add.`
                    : 'Upload master snapshot to read leadership signal.',

                footerNote: asOf ? `as of ${asOf}` : null,
            }))
        }
    },
    {
        id: '5', idx: 4, clickable: true, route: '/api/rotation/liquidity/latest', title: '05 · Liquidity Rotation Signals',
        emptyMsg: 'No liquidity snapshot loaded. Upload the liquidity HTML via the Upload panel to populate this step.',
        position: new THREE.Vector3(1.4, - 1.5, - 0.9),
        populate: (d) =>
        {
            // Layer A: Measurements
            const liq = getLiquidityState(d)
            if(liq.state || liq.topBy1w.length)
            {
                const top = liq.topBy1w[0] || {}
                const leadStr = top.key ? `${top.key} ${pct(top['1w'])}` : ''
                setHtml('.point-4 .text',
                    `${liq.state || '—'}<br>` +
                    `<span class="point-meta">1m ${pct(liq.avg1m)} · 3m ${pct(liq.avg3m)}</span><br>` +
                    `<span class="point-meta">${leadStr}</span>`)
            }
            else setText('.point-4 .text', getSummary(d))
        },
        render: (data) =>
        {
            // Layer A: Measurements (uploads — direct from fetch, not brief)
            const allRows = data.rows || data.top_by_1w || []
            const asOf    = data.as_of || data.saved_at || ''

            // Use measurements layer for state classification
            const liqM = getLiquidityState(data)
            const state   = liqM.state
            const liqConf = liqM.isExpanding
            const liqCont = liqM.isContracting
            const liqHeadline  = state
                ? liqConf ? `Liquidity expanding — conditions supportive`
                : liqCont ? `Liquidity tightening — monitor exposure`
                : `Conditions mixed — await state resolution`
                : 'Awaiting liquidity snapshot'
            const liqBadgeText = liqConf ? 'Expanding' : liqCont ? 'Contracting' : state || 'Mixed'

            // Use measurements layer for signal pair status
            const sigRowsHtml = SIGNAL_PAIRS.map(sp => {
                const sig = getSignalPairStatus(sp, allRows)
                const td = (v) => `<td>${v !== undefined ? pct(v) : '—'}</td>`
                const statusCls = sig.status.cls === 'bull' ? 'sig-bull' : sig.status.cls === 'bear' ? 'sig-bear' : sig.status.cls === 'watch' ? 'sig-watch' : 'sig-neutral'
                return (
                    `<tr>` +
                    `<td><span class="sig-pair-name">${sp.key}</span><span class="sig-pair-desc">${sp.desc}</span></td>` +
                    td(sig.v5d) + td(sig.v1m) + td(sig.v3m) + td(sig.v1y) +
                    `<td><span class="sig-status ${statusCls}">${sig.status.text}</span></td>` +
                    `</tr>`
                )
            }).join('')

            const sigTableHtml =
                `<table class="sig-table">` +
                `<thead><tr>` +
                `<th>Signal Pair</th><th>5D</th><th>1M</th><th>3M</th><th>1Y</th><th>Status</th>` +
                `</tr></thead>` +
                `<tbody>${sigRowsHtml}</tbody>` +
                `</table>`

            const statCells = [
                { label: 'Avg 1m',  value: pct(data.avg_1m), cls: (data.avg_1m || 0) > 0 ? ' pos' : ' neg' },
                { label: 'Avg 3m',  value: pct(data.avg_3m), cls: (data.avg_3m || 0) > 0 ? ' pos' : ' neg' },
                { label: 'Avg 1d',  value: pct(data.avg_1d), cls: (data.avg_1d || 0) > 0 ? ' pos' : ' neg' },
                { label: 'State',   value: liqConf ? 'Expanding' : liqCont ? 'Tightening' : 'Mixed', cls: liqConf ? ' pos' : liqCont ? ' neg' : '' },
            ]

            return renderContract(createContract({
                id:    '5',
                label: '05 · Liquidity Rotation Signals',
                title: 'Liquidity Rotation Signals',

                state:       liqBadgeText,
                signal:      liqHeadline,
                implication: liqCont ? 'Reduce exposure until state inflects' : 'Liquidity supportive — proceed to sizing',
                expression:  allRows.slice(0, 5).map(r => r.key).filter(Boolean),
                risk:        liqCont ? 'Liquidity contracting' : null,
                whatChanges: 'Liquidity state inflection',

                headline:    liqHeadline,
                badgeText:   liqBadgeText,
                badgeType:   liqConf ? 'bull' : liqCont ? 'bear' : 'neutral',

                introTitle:  'Risk-On vs Risk-Off Barometers',
                introProse:  'Eight fixed signal pairs measuring risk appetite across credit, EM, semis, dollar, and breadth dimensions.',

                compassQuote: state || null,
                compassLabel: state ? 'Liquidity state' : null,

                sections: [
                    { type: 'liqGridSection', data: { label: 'State snapshot', cells: statCells } },
                    { type: 'signalPairsTable', data: { label: 'Signal pairs — 5D · 1M · 3M · 1Y · Status', tableHtml: sigTableHtml } },
                ],

                dominoGate: 'Gate: thesis confirming',
                dominoFwd: liqCont
                    ? 'Liquidity contracting — reduce exposure until state inflects.'
                    : 'Liquidity supportive — proceed to Risk Management (06) for sizing rules.',

                footerNote: asOf ? `as of ${asOf}` : null,
            }))
        }
    },
    {
        id: '6', idx: 5, clickable: true, route: null, title: '06 · Risk Management',
        position: new THREE.Vector3(0.8, - 2.0, - 0.7),
        populate: (d) =>
        {
            // Layer B: Interpretation
            const r0 = (getRisks(d)[0] || '').split('.')[0]
            const e0 = (getExpressions(d)[0] || '').split('.')[0]
            setHtml('.point-5 .text',
                `Watch: ${r0}<br>` +
                (e0 ? `<span class="point-meta">${e0}</span>` : ''))
        },
        render: (data) =>
        {
            // Layer B: Interpretation (MIT)
            const wc     = getWhatChanged(data)
            const noRev  = wc.noReversal

            // Layer A: Measurements (uploads)
            const liqRows  = getLiquidityRows(data)
            const ind      = getIndustryBreadth(data)
            const indB1w   = ind.b1w.pct

            // Scaffolding: enrich static flags with upload measurements
            const redItems   = enrichRedFlags(RED_FLAGS, liqRows, indB1w)
            const greenItems = enrichGreenFlags(GREEN_FLAGS, liqRows, indB1w)
            const watchRows  = buildWatchlistRows(liqRows, indB1w)

            const riskLevel = noRev ? 'Active' : 'Elevated'

            return renderContract(createContract({
                id:    '6',
                label: '06 · Risk Management',
                title: 'Risk Management',

                state:       riskLevel,
                signal:      'Active monitoring · triggers · watchlist',
                implication: noRev ? 'Driver intact — monitor triggers weekly' : 'Driver shift detected — reduce first',
                risk:        redItems.filter(r => r.desc.includes('ACTIVE')).map(r => r.ticker).join(', ') || 'No active red flags',
                whatChanges: 'Two red flags activating simultaneously',

                headline:    'Active monitoring · triggers · watchlist',
                badgeText:   riskLevel,
                badgeType:   noRev ? 'neutral' : 'bear',

                introTitle:  'What To Monitor',
                introProse:  'Fixed red and green flag conditions. Status updates when upload data is loaded.',

                sections: [
                    { type: 'riskPanel', data: { redItems, greenItems } },
                    { type: 'ratioWatchlist', data: { label: 'Weekly watchlist — 9 instruments', rows: watchRows } },
                ],

                dominoFwd: noRev
                    ? 'Driver intact — monitor triggers weekly. Trim if two red flags activate simultaneously.'
                    : 'Driver shift detected — reduce first, reassess before adding.',
            }))
        }
    },
    {
        id: '7', idx: 6, clickable: true, route: null, title: '07 · Structural Risks',
        position: new THREE.Vector3(- 0.5, - 1.5, - 1.8),
        populate: (d) =>
        {
            // Layer B: Interpretation
            const mitRisks = getRisks(d)
            const r0 = (mitRisks[0] || '').split('.')[0]
            const r1 = (mitRisks[1] || '').split('.')[0]
            setHtml('.point-6 .text',
                `${r0}<br>` +
                (r1 ? `<span class="point-meta">${r1}</span>` : ''))
        },
        render: (data) =>
        {
            // Layer B: Interpretation (MIT) — issue date only
            const dates = getIssueDates(data)

            // Scaffolding: static risk scenarios
            return renderContract(createContract({
                id:    '7',
                label: '07 · Structural Risks',
                title: 'Structural Risks',

                state:       'Watch',
                signal:      'Six scenarios that could break the view',
                implication: 'These are regime-invalidating scenarios. If any fires, exit expressions first, then return to Regime State.',
                risk:        STRUCTURAL_RISKS.map(s => s.title).join('; '),
                whatChanges: 'Any structural trigger firing',

                headline:    'Six scenarios that could break the view',
                badgeText:   'Watch',
                badgeType:   'neutral',

                introTitle:  'What Could Break This View',
                introProse:  'These are regime-invalidating scenarios. If any fires, exit expressions first, then return to Regime State.',

                sections: [
                    { type: 'structuralRiskGrid', data: { risks: STRUCTURAL_RISKS } },
                ],

                footerNote: dates.previous ? `vs prior: ${priorDate(dates.previous)}` : null,

                dominoFwd: 'If any structural trigger fires: exit expressions first, return to Regime State (01).',
            }))
        }
    },
    {
        id: '8', idx: 7, clickable: false, route: null, title: 'Sources',
        position: new THREE.Vector3(- 1.2, 1.2, - 1.6),
        populate: (d) =>
        {
            // Layer B: Interpretation (issue dates)
            const dates = getIssueDates(d)
            // Layer A: Measurements (rotation timestamp)
            // Layer A: Measurements
            const asOf = getRotationTimestamp(d)
            setHtml('.point-7 .text',
                `MIT ${issueDate(dates.current)}<br>` +
                `vs ${priorDate(dates.previous)} prior<br>` +
                `<span class="point-meta">Rotation ${asOf}</span>`)
        },
        render: null
    }
]

