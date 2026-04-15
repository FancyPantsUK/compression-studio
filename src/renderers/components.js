import { THEME_TICKERS } from '../data/themes.js'
import { pct } from '../utils.js'

// Resolve active theme from MIT brief primary driver
export const resolveTheme = (d0) => {
    if(!d0) return null
    const low = d0.toLowerCase()
    const key = Object.keys(THEME_TICKERS).find(k => low.includes(k))
    if(key) return THEME_TICKERS[key]
    return { label: d0, long: [], avoid: [] }
}

// Render a tickers block (Theme + Long + Avoid chip rows)
export const tickersBlock = (theme) => {
    if(!theme) return ''
    const chip = (cls) => (t) => `<span class="ticker-chip ${cls}">${t}</span>`
    const longRow  = theme.long.length
        ? `<div class="ticker-row"><span class="ticker-row-label">Long</span>${theme.long.map(chip('ticker-chip--long')).join('')}</div>`
        : ''
    const avoidRow = theme.avoid.length
        ? `<div class="ticker-row"><span class="ticker-row-label">Avoid</span>${theme.avoid.map(chip('ticker-chip--avoid')).join('')}</div>`
        : ''
    if(!longRow && !avoidRow) return ''
    return (
        `<div class="detail-section detail-tickers">` +
        `<div class="detail-label">${theme.label}</div>` +
        longRow + avoidRow +
        `</div>`
    )
}

// Domino block — one compressed directive line at the bottom of each panel
export const dominoBlock = (gate, fwd) => {
    if(!gate && !fwd) return ''
    const gateHtml = gate ? `<span class="domino-gate">← ${gate}</span>` : ''
    const fwdHtml  = fwd  ? `<span class="domino-fwd">→ ${fwd}</span>`   : ''
    return (
        `<div class="detail-section detail-domino">` +
        `<div class="domino-line">${gateHtml}${fwdHtml}</div>` +
        `</div>`
    )
}

export const resolveWatchlistKey = (driverStr) => {
    const s = (driverStr || '').toLowerCase()
    if(s.includes('debasement') || s.includes('hard asset') || s.includes('gold') || s.includes('bitcoin')) return 'debasement'
    if(s.includes('everything code')) return 'everything_code'
    if(s.includes('exponential') || s.includes(' ai') || s.includes('ai ') || s.includes('technology') || s.includes('semiconductor')) return 'ai_expo_age'
    if(s.includes('growth') || s.includes('expansion') || s.includes('cycle') || s.includes('credit')) return 'growth'
    if(s.includes('season') || s.includes('copper') || s.includes('commodit') || s.includes('material')) return 'macro_seasons'
    if(s.includes('liquidity') || s.includes('monetary') || s.includes('central bank')) return 'liquidity'
    return null
}

// Render confirm/deny chip rows
export const confirmDenyBlock = (confirms, denies) => {
    if(!confirms.length && !denies.length) return ''
    const renderRow = (items, cls, label) =>
        `<div class="cd-row">` +
        `<span class="cd-label">${label}</span>` +
        items.map(t => `<span class="cd-chip cd-chip--${cls}" title="${t.note}">${t.label}</span>`).join('') +
        `</div>`
    return (
        `<div class="detail-section detail-section--cd">` +
        (confirms.length ? renderRow(confirms, 'conf', 'Watch') : '') +
        (denies.length   ? renderRow(denies,   'deny', 'Deny')  : '') +
        `<div class="cd-note">Check externally — not a live feed</div>` +
        `</div>`
    )
}

// Render if / then guidance rows
export const ifThenBlock = (cases) => {
    if(!cases.length) return ''
    return (
        `<div class="detail-section">` +
        `<div class="detail-label">If / Then</div>` +
        cases.map(c =>
            `<div class="ifthen-row">` +
            `<span class="ifthen-if">IF ${c.cond}</span>` +
            `<span class="ifthen-then">→ ${c.then}</span>` +
            `</div>`
        ).join('') +
        `</div>`
    )
}

// Module header — kicker + italic serif headline + regime badge
export const moduleHeader = (kicker, headline, badgeText, badgeType) => {
    const badge = badgeText
        ? `<span class="module-badge module-badge--${badgeType || 'neutral'}">${badgeText}</span>`
        : ''
    return (
        `<div class="module-header">` +
        `<span class="module-kicker">${kicker}</span>` +
        `<div class="module-headline">${headline}</div>` +
        badge +
        `</div>`
    )
}

// Word-cap helper
export const cap = (s, n) => { const w = (s || '').split(' '); return w.length > n ? w.slice(0, n).join(' ') + '…' : s }

// Compass block — dominant signal in serif italic
export const compassBlock = (quote, label) => {
    if(!quote) return ''
    return (
        `<div class="compass-block">` +
        `<div class="compass-quote">${quote}</div>` +
        (label ? `<div class="compass-label">${label}</div>` : '') +
        `</div>`
    )
}

// Liq grid — 4-cell (or 2-cell) stats at playbook scale
export const liqGrid = (cells) => {
    if(!cells.length) return ''
    const gridClass = cells.length <= 2 ? 'liq-grid liq-grid--2col' : 'liq-grid'
    return (
        `<div class="${gridClass}">` +
        cells.map(c =>
            `<div class="liq-card">` +
            `<div class="liq-value${c.cls || ''}">${c.value}</div>` +
            `<div class="liq-label">${c.label}</div>` +
            `</div>`
        ).join('') +
        `</div>`
    )
}

// Breadth bar section — visual progress rows
export const breadthSection = (rows) => {
    if(!rows.length) return ''
    return (
        `<div class="breadth-section">` +
        rows.map(r => {
            const fillW = typeof r.pct === 'number' ? Math.max(0, Math.min(100, r.pct)) : 0
            return (
                `<div class="breadth-row">` +
                `<span class="breadth-row-label">${r.label}</span>` +
                `<div class="breadth-bar"><div class="breadth-fill" style="width:${fillW}%"></div></div>` +
                `<span class="breadth-pct">${r.pct !== undefined ? r.pct + '%' : '—'}</span>` +
                `</div>`
            )
        }).join('') +
        `</div>`
    )
}

// Command grid — 3 horizon cards with command-line
export const commandGrid = (horizons) => {
    if(!horizons.length) return ''
    return (
        `<div class="command-grid">` +
        horizons.map(h =>
            `<div class="command-card">` +
            `<div class="command-card-header"><span class="command-card-horizon">${h.label}</span></div>` +
            `<div class="command-card-body">` +
            `<div class="command-line">${h.directive}</div>` +
            (h.field ? `<div class="command-field-note">${h.field}</div>` : '') +
            `</div>` +
            `</div>`
        ).join('') +
        `</div>`
    )
}

// Investment command cards — 3 horizon cards with json-block + conviction dots
export const investmentCommandsPb = (cards) => {
    if(!cards.length) return ''
    const dotsHtml = (n, max = 10) => {
        let h = '<div class="cdots">'
        for(let i = 0; i < max; i++) h += `<span class="cdot${i < n ? ' active' : ''}"></span>`
        return h + '</div>'
    }
    const valCls = (v) => {
        if(!v) return ''
        const l = v.toLowerCase()
        if(l.includes('expansion') || l.includes('long') || l.includes('bull') || l.includes('green') || l.includes('risk on') || l.includes('confirm') || l.includes('intact') || l.includes('strong')) return ' green'
        if(l.includes('caution') || l.includes('watch') || l.includes('monitor') || l.includes('mixed') || l.includes('neutral') || l.includes('hold')) return ' amber'
        if(l.includes('contraction') || l.includes('bear') || l.includes('reduce') || l.includes('avoid') || l.includes('risk off') || l.includes('hedge')) return ' red'
        return ''
    }
    return (
        `<div class="command-grid">` +
        cards.map(card =>
            `<div class="command-card">` +
            `<div class="command-card-header">` +
            `<span class="command-card-horizon">${card.horizon}</span>` +
            dotsHtml(card.confidence) +
            `</div>` +
            `<div class="command-card-body">` +
            `<div class="command-line">${card.directive}</div>` +
            `<div class="json-block">` +
            card.fields.map(f => `<div class="json-row"><span class="json-key">${f.k}</span><span class="json-val${valCls(f.v)}">${f.v}</span></div>`).join('') +
            `</div>` +
            (card.cohere ? `<div class="json-cohere">${card.cohere}</div>` : '') +
            (card.compass ? `<div class="json-compass">▸ Compass: ${card.compass}</div>` : '') +
            `</div>` +
            `</div>`
        ).join('') +
        `</div>`
    )
}

// Cluster grid (playbook scale) — 3-col cards with chips
export const clusterGridPb = (clusters) => {
    if(!clusters.length) return ''
    return (
        `<div class="cluster-grid-pb">` +
        clusters.map(c =>
            `<div class="cluster-card">` +
            `<div class="cluster-card-title">${c.label}</div>` +
            `<div class="cluster-chips-pb">` +
            c.chips.map(ch =>
                `<span class="ticker-chip-pb ${ch.type}" title="${ch.note || ''}">${ch.text}</span>`
            ).join('') +
            `</div>` +
            `</div>`
        ).join('') +
        `</div>`
    )
}

// Momentum table (playbook scale) — ticker-badge, multi-tf, persist pips
export const momentumTablePb = (rows) => {
    if(!rows.length) return ''
    const COLS = ['1m', '3m', '6m', 'ytd', '1y']
    const activeCols = COLS.filter(c => rows.some(r => typeof r[c] === 'number'))

    const valHtml = (v) => {
        if(typeof v !== 'number') return `<span class="pb-val neu">—</span>`
        const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : 'neu'
        return `<span class="pb-val ${cls}">${pct(v, 0)}</span>`
    }
    const persistHtml = (r) => {
        const pips = activeCols.map(c => {
            const v = r[c]
            if(typeof v !== 'number') return `<span class="persist-pip"></span>`
            const cls = v > 0 ? ' on' : v === 0 ? ' partial' : ''
            return `<span class="persist-pip${cls}"></span>`
        })
        return `<div class="persist-pips">${pips.join('')}</div>`
    }
    return (
        `<table class="momentum-table-pb">` +
        `<thead><tr>` +
        `<th>Ticker</th>` +
        activeCols.map(c => `<th>${c.toUpperCase()}</th>`).join('') +
        `<th>Persistence</th>` +
        `</tr></thead>` +
        `<tbody>` +
        rows.map(r =>
            `<tr>` +
            `<td><span class="ticker-badge">${r.key || '—'}</span>${r.name ? `<span class="ticker-name">${r.name}</span>` : ''}</td>` +
            activeCols.map(c => `<td>${valHtml(r[c])}</td>`).join('') +
            `<td>${persistHtml(r)}</td>` +
            `</tr>`
        ).join('') +
        `</tbody></table>`
    )
}

// Risk panels (playbook scale) — danger/safe two-col, ticker+desc+trigger
export const riskPanelPb = (redItems, greenItems) => {
    if(!redItems.length && !greenItems.length) return ''
    const renderPanel = (items, variant, header) => {
        if(!items.length) return ''
        return (
            `<div class="risk-panel-pb ${variant}">` +
            `<div class="risk-panel-header">${header}</div>` +
            `<div class="risk-items-pb">` +
            items.map(item => {
                if(typeof item === 'string') {
                    return `<div class="risk-item-pb"><span class="risk-desc">${item}</span></div>`
                }
                return (
                    `<div class="risk-item-pb">` +
                    (item.ticker ? `<span class="risk-ticker">${item.ticker}</span>` : '') +
                    `<span class="risk-desc">${item.desc || ''}</span>` +
                    (item.trigger ? `<span class="risk-trigger">Trigger: ${item.trigger}</span>` : '') +
                    `</div>`
                )
            }).join('') +
            `</div>` +
            `</div>`
        )
    }
    return (
        `<div class="risk-panels-pb">` +
        renderPanel(redItems, 'danger', 'Red Flags') +
        renderPanel(greenItems, 'safe', 'Green Flags') +
        `</div>`
    )
}

// Ratio table — watch pairs with status label
export const ratioTable = (rows) => {
    if(!rows.length) return ''
    return (
        `<table class="ratio-table">` +
        `<thead><tr><th>Instrument</th><th>Status</th><th>Note</th></tr></thead>` +
        `<tbody>` +
        rows.map(r =>
            `<tr>` +
            `<td class="ratio-pair">${r.pair}</td>` +
            `<td class="ratio-status ${r.status}">${r.label}</td>` +
            `<td class="ratio-note">${r.note || ''}</td>` +
            `</tr>`
        ).join('') +
        `</tbody></table>`
    )
}
