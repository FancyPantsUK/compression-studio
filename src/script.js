import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { gsap } from 'gsap'
import earthVertexShader      from './shaders/earth/vertex.glsl'
import earthFragmentShader    from './shaders/earth/fragment.glsl'
import atmosphereVertexShader from './shaders/atmosphere/vertex.glsl'
import atmosphereFragmentShader from './shaders/atmosphere/fragment.glsl'

/**
 * Loaders
 */
const loadingBarElement = document.querySelector('.loading-bar')

let sceneReady = false
const loadingManager = new THREE.LoadingManager(
    // Loaded
    () =>
    {
        // Wait a little
        window.setTimeout(() =>
        {
            // Animate overlay
            gsap.to(overlayMaterial.uniforms.uAlpha, { duration: 3, value: 0, delay: 1 })

            // Update loadingBarElement
            loadingBarElement.classList.add('ended')
            loadingBarElement.style.transform = ''
        }, 500)

        window.setTimeout(() =>
        {
            sceneReady = true
        }, 2000)
    },

    // Progress
    (itemUrl, itemsLoaded, itemsTotal) =>
    {
        // Calculate the progress and update the loadingBarElement
        const progressRatio = itemsLoaded / itemsTotal
        loadingBarElement.style.transform = `scaleX(${progressRatio})`
    }
)
const textureLoader = new THREE.TextureLoader(loadingManager)

/**
 * Base
 */
// Debug
const debugObject = {}

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Overlay
 */
const overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1)
const overlayMaterial = new THREE.ShaderMaterial({
    // wireframe: true,
    transparent: true,
    uniforms:
    {
        uAlpha: { value: 1 }
    },
    vertexShader: `
        void main()
        {
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uAlpha;

        void main()
        {
            gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
        }
    `
})
const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial)
scene.add(overlay)

/**
 * Earth
 */
const earthDayTexture = textureLoader.load('/earth/day.jpg')
earthDayTexture.colorSpace = THREE.SRGBColorSpace
earthDayTexture.anisotropy  = 8

const earthNightTexture = textureLoader.load('/earth/night.jpg')
earthNightTexture.colorSpace = THREE.SRGBColorSpace
earthNightTexture.anisotropy  = 8

const earthSpecularCloudsTexture = textureLoader.load('/earth/specularClouds.jpg')
earthSpecularCloudsTexture.anisotropy = 8

const earthGeometry = new THREE.SphereGeometry(2, 64, 64)

const earthMaterial = new THREE.ShaderMaterial({
    vertexShader:   earthVertexShader,
    fragmentShader: earthFragmentShader,
    uniforms: {
        uDayTexture:              new THREE.Uniform(earthDayTexture),
        uNightTexture:            new THREE.Uniform(earthNightTexture),
        uSpecularCloudsTexture:   new THREE.Uniform(earthSpecularCloudsTexture),
        uSunDirection:            new THREE.Uniform(new THREE.Vector3(0, 0, 1)),
        uAtmosphereDayColor:      new THREE.Uniform(new THREE.Color('#00aaff')),
        uAtmosphereTwilightColor: new THREE.Uniform(new THREE.Color('#ff6600')),
    }
})
const earth = new THREE.Mesh(earthGeometry, earthMaterial)
scene.add(earth)

const atmosphereMaterial = new THREE.ShaderMaterial({
    side:        THREE.BackSide,
    transparent: true,
    vertexShader:   atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    uniforms: {
        uSunDirection:            new THREE.Uniform(new THREE.Vector3(0, 0, 1)),
        uAtmosphereDayColor:      new THREE.Uniform(new THREE.Color('#00aaff')),
        uAtmosphereTwilightColor: new THREE.Uniform(new THREE.Color('#ff6600')),
    }
})
const atmosphere = new THREE.Mesh(earthGeometry, atmosphereMaterial)
atmosphere.scale.set(1.04, 1.04, 1.04)
atmosphere.raycast = () => {}   // excluded from point-occlusion raycasting
scene.add(atmosphere)

// Sun direction — front-facing, above the equator, toward the camera hemisphere
// phi = 0.33π (~60° from Y) keeps it above equator for top-lit look
// theta = 0.8π (~144° from Z) brings it to the -Z / +X side where camera lives
const sunSpherical = new THREE.Spherical(1, Math.PI * 0.233, Math.PI * 0.8)
const sunDirection  = new THREE.Vector3()
const updateSun = () =>
{
    sunDirection.setFromSpherical(sunSpherical)
    earthMaterial.uniforms.uSunDirection.value.copy(sunDirection)
    atmosphereMaterial.uniforms.uSunDirection.value.copy(sunDirection)
}
updateSun()

/**
 * Helpers
 */
const setText = (selector, text) =>
{
    const el = document.querySelector(selector)
    if(el) el.textContent = text
}

const setHtml = (selector, html) =>
{
    const el = document.querySelector(selector)
    if(el) el.innerHTML = html
}

// Strip citation codes like (C3) (P1) that bleed through from the brief
const strip = (s) => (s || '').replace(/\s*\([CP]\d+\)/g, '').trim()

// Signed percentage string with fixed decimal
const pct = (n, dec = 1) =>
    typeof n === 'number' ? (n >= 0 ? '+' : '') + n.toFixed(dec) + '%' : '—'

// Parse MIT issue ID → readable date. "_RV_Alpha-MIT-Apr0626_v3" → "Apr 06 2026"
const issueDate = (id) =>
{
    const m = (id || '').match(/([A-Za-z]{3})(\d{2})(\d{2})/)
    return m ? `${m[1]} ${m[2]} 20${m[3]}` : (id || '').replace(/^_/, '').replace(/_v\d+$/, '')
}

// Parse prior issue ID → short label. "20260326_..." → "Mar 26"
const priorDate = (id) =>
{
    const m = (id || '').match(/^(\d{4})(\d{2})(\d{2})/)
    if(!m) return (id || '').replace(/_v\d+$/, '')
    const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${mon[+ m[2] - 1]} ${m[3]}`
}


/**
 * Theme → ticker mapping
 * Keyed on lowercase substrings of MIT key_drivers[0].
 * Graceful fallback: no match → label = driver string, no chips.
 */
const THEME_TICKERS = {
    'exponential age':  { label: 'AI / Exponential Age',     long: ['QQQ','NVDA','ARKK','SMH'],   avoid: ['GLD','XLE'] },
    'exponential':      { label: 'AI / Exponential Age',     long: ['QQQ','NVDA','ARKK','SMH'],   avoid: ['GLD','XLE'] },
    'artificial intel': { label: 'AI / Exponential Age',     long: ['QQQ','NVDA','ARKK','SMH'],   avoid: ['GLD','XLE'] },
    'debasement':       { label: 'Debasement / Hard Assets', long: ['BTC','GLD','SLV','TIPS'],    avoid: ['TLT','UUP'] },
    'everything code':  { label: 'Everything Code',          long: ['BTC','SPX','GLD'],           avoid: ['CASH','TLT'] },
    'global liquidity': { label: 'Liquidity Expansion',      long: ['SPY','EEM','HYG','BTC'],     avoid: ['SHY','UUP'] },
    'liquidity':        { label: 'Liquidity Expansion',      long: ['SPY','EEM','HYG','BTC'],     avoid: ['SHY','UUP'] },
    'credit':           { label: 'Credit Cycle',             long: ['HYG','JNK','LQD'],           avoid: ['TLT'] },
    'dollar weakness':  { label: 'Dollar Weakness',          long: ['GLD','EEM','BTC'],           avoid: ['UUP','TLT'] },
    'dollar':           { label: 'Dollar Dynamics',          long: ['GLD','EEM','BTC'],           avoid: ['UUP'] },
    'risk on':          { label: 'Risk-On',                  long: ['SPY','QQQ','EEM','HYG'],     avoid: ['TLT','GLD'] },
    'risk off':         { label: 'Risk-Off / Defensive',     long: ['TLT','GLD','VXX'],           avoid: ['SPY','HYG'] },
    'recession':        { label: 'Late Cycle / Defensive',   long: ['TLT','GLD','XLU'],           avoid: ['HYG','SPY'] },
    'inflation':        { label: 'Inflation / Real Assets',  long: ['GLD','SLV','TIP','PDBC'],    avoid: ['TLT','SHY'] },
}

// Resolve active theme from MIT brief primary driver
const resolveTheme = (d0) => {
    if(!d0) return null
    const low = d0.toLowerCase()
    const key = Object.keys(THEME_TICKERS).find(k => low.includes(k))
    if(key) return THEME_TICKERS[key]
    return { label: d0, long: [], avoid: [] }
}

// Render a tickers block (Theme + Long + Avoid chip rows)
const tickersBlock = (theme) => {
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
// gate: what must be true for this step to be valid
// fwd: what this step enables downstream when conditions align
const dominoBlock = (gate, fwd) => {
    if(!gate && !fwd) return ''
    const gateHtml = gate ? `<span class="domino-gate">← ${gate}</span>` : ''
    const fwdHtml  = fwd  ? `<span class="domino-fwd">→ ${fwd}</span>`   : ''
    return (
        `<div class="detail-section detail-domino">` +
        `<div class="domino-line">${gateHtml}${fwdHtml}</div>` +
        `</div>`
    )
}

// ── Confirm / Deny watchlists ──────────────────────────────────────────────
// Prefer ratios where they are more informative than standalone tickers.
// These are watch / confirmation signals — not a live feed.
const WATCHLISTS = {
    liquidity: {
        confirm: [
            { label: 'HYG:IEF',  note: 'Spread compression — credit unlocked vs duration' },
            { label: 'EEM',       note: '↑ EM bid when global liquidity expands' },
            { label: 'DXY',       note: '↓ Dollar weakening = liquidity unlocked' },
            { label: 'VIX',       note: '↓ Vol compressed = risk appetite intact' },
        ],
        deny: [
            { label: 'DXY',       note: '↑ Dollar surge = global tightening' },
            { label: 'HYG:IEF',   note: '↓ Spreads widening = credit stress' },
            { label: 'VIX',       note: '↑ Rising vol = risk-off override' },
        ],
    },
    everything_code: {
        confirm: [
            { label: 'BTC',       note: '↑ Leads the code in every cycle' },
            { label: 'XLF:SPY',   note: '↑ Financials vs market = credit cycle confirming' },
            { label: 'GLD',       note: '↑ Debasement bid alongside equity' },
            { label: 'DXY',       note: '↓ Dollar weakness = code unlocked' },
        ],
        deny: [
            { label: 'BTC',       note: '↓ Code breaking down' },
            { label: 'DXY',       note: '↑ Dollar surge = code suppressed' },
            { label: 'VIX',       note: '↑ Risk-off negates the thesis' },
        ],
    },
    debasement: {
        confirm: [
            { label: 'BTC',       note: '↑ Hardest money bid' },
            { label: 'GLD:TLT',   note: '↑ Gold vs bonds = real rates falling' },
            { label: 'DXY',       note: '↓ Dollar weakening = fiat losing ground' },
        ],
        deny: [
            { label: 'DXY',       note: '↑ Dollar strengthening negates debasement' },
            { label: 'GLD:TLT',   note: '↓ Bonds outperforming gold = real yields rising' },
            { label: 'BTC',       note: '↓ Hard money failing' },
        ],
    },
    ai_expo_age: {
        confirm: [
            { label: 'SMH:QQQ',   note: '↑ Semis outperforming tech = AI capex accelerating' },
            { label: 'NVDA',      note: '↑ Infrastructure demand confirmed' },
            { label: 'IWF:IWD',   note: '↑ Growth vs value = multiple expansion regime' },
        ],
        deny: [
            { label: 'SMH:QQQ',   note: '↓ Semis lagging tech = capex cycle cooling' },
            { label: 'XLU:SPY',   note: '↑ Defensives vs market = rotation away from growth' },
        ],
    },
    growth: {
        confirm: [
            { label: 'HYG:IEF',   note: '↑ Credit appetite = cycle expanding' },
            { label: 'IWM:SPY',   note: '↑ Small caps vs large = breadth-led bull' },
            { label: 'XLF:SPY',   note: '↑ Financials leading = curve and credit healthy' },
        ],
        deny: [
            { label: 'XLU:SPY',   note: '↑ Defensives outperforming = growth rotation ending' },
            { label: 'IWM:SPY',   note: '↓ Small caps lagging = breadth narrowing' },
        ],
    },
    macro_seasons: {
        confirm: [
            { label: 'CPER',      note: '↑ Copper demand = early/mid cycle' },
            { label: 'XLB:SPY',   note: '↑ Materials vs market = cyclical rotation' },
        ],
        deny: [
            { label: 'XLU:SPY',   note: '↑ Defensives outperforming = late cycle / winter' },
            { label: 'GLD:CPER',  note: '↑ Gold vs copper = fear over growth' },
        ],
    },
}

const resolveWatchlistKey = (driverStr) => {
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
const confirmDenyBlock = (confirms, denies) => {
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
const ifThenBlock = (cases) => {
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

// ── Module header — kicker + italic serif headline + regime badge ──────────
const moduleHeader = (kicker, headline, badgeText, badgeType) => {
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

// ── Word-cap helper ────────────────────────────────────────────────────────
const cap = (s, n) => { const w = (s || '').split(' '); return w.length > n ? w.slice(0, n).join(' ') + '…' : s }

// ── Compass block — dominant signal in serif italic ────────────────────────
const compassBlock = (quote, label) => {
    if(!quote) return ''
    return (
        `<div class="compass-block">` +
        `<div class="compass-quote">${quote}</div>` +
        (label ? `<div class="compass-label">${label}</div>` : '') +
        `</div>`
    )
}

// ── Liq grid — 4-cell (or 2-cell) stats at playbook scale ─────────────────
const liqGrid = (cells) => {
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

// ── Breadth bar section — visual progress rows ─────────────────────────────
const breadthSection = (rows) => {
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

// ── Command grid — 3 horizon cards with command-line ──────────────────────
const commandGrid = (horizons) => {
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

// ── Investment command cards — 3 horizon cards with json-block + conviction dots
const investmentCommandsPb = (cards) => {
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

// ── Cluster grid (playbook scale) — 3-col cards with chips ────────────────
const clusterGridPb = (clusters) => {
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

// ── Momentum table (playbook scale) — ticker-badge, multi-tf, persist pips ─
// Columns: Ticker, 1M, 3M, 6M, YTD, 1Y, Persistence (individual square pips)
const momentumTablePb = (rows) => {
    if(!rows.length) return ''
    const COLS = ['1m', '3m', '6m', 'ytd', '1y']
    const activeCols = COLS.filter(c => rows.some(r => typeof r[c] === 'number'))

    const valHtml = (v) => {
        if(typeof v !== 'number') return `<span class="pb-val neu">—</span>`
        const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : 'neu'
        return `<span class="pb-val ${cls}">${pct(v, 0)}</span>`
    }
    // Individual square pips — one pip per timeframe column
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

// ── Risk panels (playbook scale) — danger/safe two-col, ticker+desc+trigger
const riskPanelPb = (redItems, greenItems) => {
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

// ── Ratio table — watch pairs with status label ────────────────────────────
const ratioTable = (rows) => {
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
const POINTS = [
    {
        id: '1', idx: 0, clickable: true, route: null, title: '01 · Regime State',
        position: new THREE.Vector3(1.5, 1.7, - 0.6),
        populate: (d) =>
        {
            const thesis  = strip(d.regime_view).split('.')[0]
            const driver  = strip((d.key_drivers || [])[0])
            const changed = strip(d.what_changed).split('.')[0]
            setHtml('.point-0 .text',
                `${thesis}<br>` +
                `<span class="point-meta">${driver}</span><br>` +
                `<span class="point-meta">Δ ${changed}</span>`)
        },
        render: (data) =>
        {
            const rv      = strip(data.regime_view)
            const d0      = strip((data.key_drivers || [])[0])
            const liqRot  = data.liquidity_rotation || {}
            const indRot  = data.industry_rotation  || {}

            const rvLow  = rv.toLowerCase()
            const isExp  = rvLow.includes('expansion') || rvLow.includes('bull') || rvLow.includes('risk on') || rvLow.includes('accelerat') || rvLow.includes('recovery')
            const isCaut = rvLow.includes('risk off') || rvLow.includes('contract') || rvLow.includes('recession') || rvLow.includes('tighten')
            const badgeText = isExp ? 'Expansion' : isCaut ? 'Caution' : 'Neutral'
            const badgeType = isExp ? 'bull' : isCaut ? 'bear' : 'neutral'

            const liqState = liqRot.liquidity_state || ''
            const liqConf  = liqState.toLowerCase().includes('expand') || liqState.toLowerCase().includes('rising') || liqState.toLowerCase().includes('easy')
            const liqCaut2 = liqState.toLowerCase().includes('contract') || liqState.toLowerCase().includes('tight') || liqState.toLowerCase().includes('falling')

            // Breadth data from uploads
            const indB1w   = ((indRot.breadth || {})['1w'] || {})
            const indB1m   = ((indRot.breadth || {})['1m'] || {})
            const indB1wPct   = indB1w.pct_positive
            const indB1mPct   = indB1m.pct_positive
            const indB1wCount = indB1w.count
            const indB1wTotal = indB1w.total
            const indB1mCount = indB1m.count
            const indB1mTotal = indB1m.total

            // Look up signal pairs from liquidity upload basket — prefer full rows cache
            const topLiq  = liqFullRows.length ? liqFullRows : (liqRot.top_by_1w || [])
            const findPair = (keys) => topLiq.find(r => keys.some(k => (r.key || '').toLowerCase().includes(k)))
            const uupRow  = findPair(['uup:spy', 'uup'])
            const eemRow  = findPair(['eem:spy', 'eem'])
            const soxxRow = findPair(['soxx:qqq', 'soxx'])

            // ISM breadth — maps to industry breadth from upload (best available proxy)
            const ismBreadthVal = indB1wPct !== undefined ? `${indB1wPct}%` : '—'
            const ismSub        = indB1wPct !== undefined ? 'ind breadth proxy' : 'upload industry'

            // liq-card cell builder with sub-label
            const cell = (label, value, sub, cls) =>
                `<div class="liq-card">` +
                `<div class="liq-value${cls || ''}">${value}</div>` +
                `<div class="liq-sub">${sub}</div>` +
                `<div class="liq-label">${label}</div>` +
                `</div>`

            const regimeVal = isExp ? 'Expansion' : isCaut ? 'Contraction' : 'Neutral'
            const regimeSub = isExp ? 'risk-on confirmed' : isCaut ? 'risk-off elevated' : 'mixed signals'
            const regimeCls = isExp ? ' pos' : isCaut ? ' neg' : ''

            const fedLiqVal = liqState ? liqState.split(' ').slice(0, 2).join(' ') : '—'
            const fedLiqSub = liqState ? liqState.split(' ').slice(2, 5).join(' ') || 'net liquidity' : 'upload liquidity'
            const fedLiqCls = liqConf ? ' pos' : liqCaut2 ? ' neg' : ''

            const ismVal = ismBreadthVal
            const ismCls = indB1wPct !== undefined ? indB1wPct >= 55 ? ' pos' : indB1wPct < 40 ? ' neg' : ' warn' : ''

            const mb1wVal = indB1wPct !== undefined ? `${indB1wPct}%` : '—'
            const mb1wSub = indB1wCount !== undefined ? `${indB1wCount}/${indB1wTotal} positive` : 'upload industry'
            const mb1wCls = indB1wPct !== undefined ? indB1wPct >= 55 ? ' pos' : indB1wPct < 40 ? ' neg' : ' warn' : ''

            const mb1mVal = indB1mPct !== undefined ? `${indB1mPct}%` : '—'
            const mb1mSub = indB1mCount !== undefined ? `${indB1mCount}/${indB1mTotal} positive` : 'upload industry'
            const mb1mCls = indB1mPct !== undefined ? indB1mPct >= 55 ? ' pos' : indB1mPct < 40 ? ' neg' : ' warn' : ''

            const uupVal = uupRow ? pct(uupRow['1w']) : '—'
            const uupSub = uupRow ? (typeof uupRow['1m'] === 'number' ? `1m ${pct(uupRow['1m'])}` : '1m —') : 'dollar strength signal'
            const uupCls = uupRow ? ((uupRow['1w'] || 0) < 0 ? ' pos' : (uupRow['1w'] || 0) > 0 ? ' neg' : '') : ''  // inverted — falling USD = bullish

            const eemVal = eemRow ? pct(eemRow['1w']) : '—'
            const eemSub = eemRow ? (typeof eemRow['1m'] === 'number' ? `1m ${pct(eemRow['1m'])}` : '1m —') : 'EM vs US breadth'
            const eemCls = eemRow ? ((eemRow['1w'] || 0) > 0 ? ' pos' : (eemRow['1w'] || 0) < 0 ? ' neg' : '') : ''

            const soxxVal = soxxRow ? pct(soxxRow['1w']) : '—'
            const soxxSub = soxxRow ? (typeof soxxRow['1m'] === 'number' ? `1m ${pct(soxxRow['1m'])}` : '1m —') : 'semis vs tech'
            const soxxCls = soxxRow ? ((soxxRow['1w'] || 0) > 0 ? ' pos' : (soxxRow['1w'] || 0) < 0 ? ' neg' : '') : ''

            const gridHtml =
                `<div class="liq-grid">` +
                cell('Regime',               regimeVal, regimeSub, regimeCls) +
                cell('Fed Net Liquidity',     fedLiqVal, fedLiqSub, fedLiqCls) +
                cell('ISM Breadth',           ismVal,    ismSub,    ismCls) +
                cell('Market Breadth (1W)',   mb1wVal,   mb1wSub,   mb1wCls) +
                cell('Market Breadth (1M)',   mb1mVal,   mb1mSub,   mb1mCls) +
                cell('USD (UUP:SPY)',         uupVal,    uupSub,    uupCls) +
                cell('EM vs US (EEM:SPY)',    eemVal,    eemSub,    eemCls) +
                cell('Semis vs QQQ',          soxxVal,   soxxSub,   soxxCls) +
                `</div>`

            // Breadth bars with count/total label
            const barsHtml = (indB1wPct !== undefined || indB1mPct !== undefined)
                ? `<div class="breadth-section">` +
                  (indB1wPct !== undefined
                      ? `<div class="breadth-row">` +
                        `<span class="breadth-row-label">Market Breadth 1W</span>` +
                        `<div class="breadth-bar"><div class="breadth-fill" style="width:${indB1wPct}%"></div></div>` +
                        `<span class="breadth-pct">${indB1wCount || '—'}/${indB1wTotal || '—'}</span>` +
                        `</div>` : '') +
                  (indB1mPct !== undefined
                      ? `<div class="breadth-row">` +
                        `<span class="breadth-row-label">Market Breadth 1M</span>` +
                        `<div class="breadth-bar"><div class="breadth-fill" style="width:${indB1mPct}%"></div></div>` +
                        `<span class="breadth-pct">${indB1mCount || '—'}/${indB1mTotal || '—'}</span>` +
                        `</div>` : '') +
                  `</div>` : ''

            return (
                moduleHeader('01 · Regime State', d0 || rv.split('.')[0] || '—', badgeText, badgeType) +
                `<h2 class="pb-h2">Where We Are In The Cycle</h2>` +
                `<p class="pb-intro">${cap(rv.split('.')[0], 20) || '—'}.</p>` +
                `<div class="pb-section">` +
                `<div class="pb-section-label">State matrix</div>` +
                gridHtml +
                barsHtml +
                `</div>` +
                `<div class="pb-small-note">1W breadth is more volatile — use 1M for trend confirmation. USD (UUP:SPY) inverts: falling = bullish for risk assets.</div>` +
                dominoBlock(null, 'Regime confirmed — see Investment Commands (02) for position framing.')
            )
        }
    },
    {
        id: '2', idx: 1, clickable: true, route: null, title: '02 · Investment Commands',
        position: new THREE.Vector3(2.0, 0.8, - 0.6),
        populate: (d) =>
        {
            const rv = strip(d.regime_view).split('.')[0]
            const e0 = strip((d.best_expressions || [])[0]).split('.')[0]
            setHtml('.point-1 .text',
                `${rv}<br>` +
                (e0 ? `<span class="point-meta">${e0}</span>` : ''))
        },
        render: (data) =>
        {
            const rv      = strip(data.regime_view)
            const summ    = strip(data.summary)
            const changed = strip(data.what_changed)
            const drivers = (data.key_drivers || []).slice(0, 3).map(strip)
            const d0      = drivers[0] || ''
            const exprs   = (data.best_expressions || []).slice(0, 5).map(strip)
            const risks   = (data.risks_or_watchpoints || []).slice(0, 3).map(strip)
            const e0 = exprs[0] || ''
            const e1 = exprs[1] || ''
            const r0 = risks[0] || ''
            const r1 = risks[1] || ''
            const r2 = risks[2] || ''

            const rvLow  = rv.toLowerCase()
            const isExp  = rvLow.includes('expansion') || rvLow.includes('bull') || rvLow.includes('risk on') || rvLow.includes('accelerat') || rvLow.includes('recovery')
            const isCaut = rvLow.includes('risk off') || rvLow.includes('contract') || rvLow.includes('recession') || rvLow.includes('tighten')
            const bias   = isExp ? 'Long risk' : isCaut ? 'Reduce / hedge' : 'Neutral'
            const noRev  = !['reversal', 'breakdown', 'breaking', 'no longer'].some(w => changed.toLowerCase().includes(w))

            // 10-dot confidence scale (out of 10)
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

            return (
                moduleHeader('02 · Investment Commands', cap(rv.split('.')[0] || '—', 10), badgeText, badgeType) +
                `<h2 class="pb-h2">Playbook Across Horizons</h2>` +
                `<p class="pb-intro">Position sizing and directional commands across tactical, intermediate, and strategic time horizons.</p>` +
                `<div class="pb-section">` +
                `<div class="pb-section-label">Horizon command cards — 1M · 3M · 9M</div>` +
                investmentCommandsPb(cards) +
                `</div>` +
                dominoBlock(
                    null,
                    'Commands set. Confirm via Sector Clusters (03) and Liquidity Signals (05) before sizing.'
                )
            )
        }
    },
    {
        id: '3', idx: 2, clickable: true, route: '/api/rotation/industry/latest', title: '03 · Sector Clusters To Own',
        emptyMsg: 'No industry snapshot loaded. Upload the industry HTML via the Upload panel to populate this step.',
        position: new THREE.Vector3(0.5, 1.5, - 1.8),
        populate: (d) =>
        {
            const ir = d.industry_rotation
            if(ir)
            {
                const top  = (ir.top_by_1w || [])[0] || {}
                const b1w  = ((ir.breadth || {})['1w'] || {}).pct_positive
                const line = strip((ir.expression_takeaway || '').split('. ')[0])
                setHtml('.point-2 .text',
                    `${line || 'Sector rotation'}<br>` +
                    `<span class="point-meta">${top.key ? top.key + ' ' + pct(top['1w']) : ''}</span><br>` +
                    `<span class="point-meta">Breadth 1w: ${b1w !== undefined ? b1w + '%' : '—'}</span>`)
            }
            else setText('.point-2 .text', 'Upload industry snapshot')
        },
        render: (data) =>
        {
            const tops1w = data.top_by_1w || []
            const tops1m = data.top_by_1m || []
            const b1w    = ((data.breadth || {})['1w'] || {}).pct_positive
            const line   = strip(data.expression_takeaway || '')
            const asOf   = data.as_of || data.saved_at || ''

            // STATIC cluster definitions — exact playbook section 03 contract
            const PLAYBOOK_CLUSTERS = [
                { icon: '⚡', label: 'Semi Equipment',       tickers: ['LRCX','KLAC','AMAT','ASML','MU','MRVL','SMH','SOXX'],            type: 'lead' },
                { icon: '🛢️', label: 'Energy Services',      tickers: ['OIH','HAL','SLB','BKR','XOP','XLE','USO'],                        type: 'lead' },
                { icon: '🔩', label: 'Industrial/Heavy',     tickers: ['CAT','ETN','DE','VRT','GEV','PH','XLI','PAVE'],                   type: 'lead' },
                { icon: '🏗️', label: 'Metals/Miners',        tickers: ['FCX','SCCO','COPX','AA','VALE','BHP','XLB','ALB'],                type: 'lead' },
                { icon: '🌍', label: 'EM/International',     tickers: ['EEM','EFA','TSM','VALE','EWJ','VEU','FEZ'],                        type: 'support' },
                { icon: '🪙', label: 'Precious Metals',      tickers: ['GLD','GDX','SLV','WPM','NEM','FNV'],                              type: 'support' },
                { icon: '🚫', label: 'Avoid/Underweight',    tickers: ['NOW','SNOW','CRM','MSFT','IGV','PLTR','CLOU','DDOG'],             type: 'avoid' },
                { icon: '⚠️', label: 'Watch Carefully',      tickers: ['NVDA','META','AMZN','XLF','UNH','TSLA'],                          type: 'watch' },
                { icon: '🏦', label: 'Defensive Liquidity',  tickers: ['HYG','EMB','TIP','NEE','DUK','XLU'],                             type: 'watch' },
            ]

            // Build upload lead-set: tickers appearing in top_by_1m or top_by_1w
            const leadKeys = new Set([
                ...tops1w.map(r => (r.key || '').toUpperCase()),
                ...tops1m.map(r => (r.key || '').toUpperCase()),
            ])

            // Build cluster chip arrays — static tickers, dynamic lead marking
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

            return (
                moduleHeader('03 · Sector Clusters To Own', headLine, verdictTxt || null, verdictBadge) +
                `<h2 class="pb-h2">Where To Concentrate</h2>` +
                `<p class="pb-intro">Named playbook clusters and their current leadership status. Gold chips = confirmed by upload data.</p>` +
                (line ? compassBlock(cap(line.split('.')[0], 15), 'Rotation takeaway') : '') +
                `<div class="pb-section">` +
                `<div class="pb-section-label">Own — cyclical & growth clusters</div>` +
                clusterGridPb(ownClusters) +
                `</div>` +
                `<div class="pb-section">` +
                `<div class="pb-section-label">Special handling — avoid · watch · defensive</div>` +
                clusterGridPb(specialClusters) +
                `</div>` +
                dominoBlock(
                    'Gate: regime confirming',
                    b1w !== undefined
                        ? b1w >= 55
                            ? `Sector clusters active — proceed to Momentum Leaders (04).`
                            : `Breadth thin (${b1w}%) — check Momentum (04) before sizing clusters.`
                        : 'Upload industry snapshot to read cluster leadership.'
                ) +
                (asOf ? `<div class="detail-section"><div style="opacity:0.4;font-size:10px;font-family:var(--pb-mono)">as of ${asOf}</div></div>` : '')
            )
        }
    },
    {
        id: '4', idx: 3, clickable: true, route: '/api/rotation/master/latest', title: '04 · Momentum & Persistence Leaders',
        emptyMsg: 'No master snapshot loaded. Upload the master HTML via the Upload panel to populate this step.',
        position: new THREE.Vector3(2.1, - 0.2, - 0.8),
        populate: (d) =>
        {
            const mr = d.master_rotation
            if(mr)
            {
                const m1  = (mr.top_by_1m || [])[0] || {}
                const m3  = (mr.top_by_3m || [])[0] || {}
                const b1m = ((mr.breadth || {})['1m'] || {}).pct_positive
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

            return (
                moduleHeader('04 · Momentum & Persistence Leaders', ldrHeadline, healthTxt, b1m !== undefined ? b1m >= 60 ? 'bull' : b1m < 40 ? 'bear' : 'neutral' : 'neutral') +
                `<h2 class="pb-h2">Tickers Showing Sustained Strength</h2>` +
                `<p class="pb-intro">Master list leaders ranked by 1M momentum. Persistence shows how many timeframes are positive.</p>` +
                `<div class="pb-section">` +
                `<div class="pb-section-label">Breadth snapshot</div>` +
                liqGrid(statCells) +
                breadthSection(breadthRows) +
                `</div>` +
                `<div class="pb-section">` +
                `<div class="pb-section-label">Leaders — 1M · 3M · 6M · YTD · 1Y · Persistence</div>` +
                momentumTablePb(tableRows) +
                `</div>` +
                `<div class="pb-small-note">Persistence = number of timeframes with positive return. Leaders showing ≥4/5 are high-conviction.</div>` +
                dominoBlock(
                    'Gate: rotation breadth positive',
                    b1m !== undefined
                        ? b1m >= 55
                            ? `Leadership confirms theme — proceed to Liquidity Signals (05).`
                            : `Leadership mixed (${b1m}% 1m) — hold current sizing, do not add.`
                        : 'Upload master snapshot to read leadership signal.'
                ) +
                (asOf ? `<div class="detail-section"><div style="opacity:0.4;font-size:10px;font-family:var(--pb-mono)">as of ${asOf}</div></div>` : '')
            )
        }
    },
    {
        id: '5', idx: 4, clickable: true, route: '/api/rotation/liquidity/latest', title: '05 · Liquidity Rotation Signals',
        emptyMsg: 'No liquidity snapshot loaded. Upload the liquidity HTML via the Upload panel to populate this step.',
        position: new THREE.Vector3(1.4, - 1.5, - 0.9),
        populate: (d) =>
        {
            const ld = d.liquidity_rotation
            if(ld)
            {
                const top = (ld.top_by_1w || [])[0] || {}
                const leadStr = top.key ? `${top.key} ${pct(top['1w'])}` : ''
                setHtml('.point-4 .text',
                    `${ld.liquidity_state || '—'}<br>` +
                    `<span class="point-meta">1m ${pct(ld.avg_1m)} · 3m ${pct(ld.avg_3m)}</span><br>` +
                    `<span class="point-meta">${leadStr}</span>`)
            }
            else setText('.point-4 .text', strip(d.summary))
        },
        render: (data) =>
        {
            const allRows = data.rows || data.top_by_1w || []
            const asOf    = data.as_of || data.saved_at || ''
            const state   = data.liquidity_state || ''
            const stateL  = state.toLowerCase()
            const liqConf = stateL.includes('expand') || stateL.includes('rising') || stateL.includes('easy') || stateL.includes('positive')
            const liqCont = stateL.includes('contract') || stateL.includes('tight') || stateL.includes('falling') || stateL.includes('negative')
            const liqHeadline  = state
                ? liqConf ? `Liquidity expanding — conditions supportive`
                : liqCont ? `Liquidity tightening — monitor exposure`
                : `Conditions mixed — await state resolution`
                : 'Awaiting liquidity snapshot'
            const liqBadge     = liqConf ? 'bull' : liqCont ? 'bear' : 'neutral'
            const liqBadgeText = liqConf ? 'Expanding' : liqCont ? 'Contracting' : state || 'Mixed'

            // STATIC signal pairs — exact playbook section 05 contract
            // desc = sub-label in Signal Pair column
            // invert = true means negative return = bullish (USD pairs)
            const SIGNAL_PAIRS = [
                { key: 'SOXX:QQQ',  desc: 'Semis vs tech — risk appetite' },
                { key: 'EEM:SPY',   desc: 'EM vs US — global breadth' },
                { key: 'EEM:IEF',   desc: 'EM vs bonds — risk-on gauge' },
                { key: 'HYG:IEF',   desc: 'Credit vs duration — spread signal' },
                { key: 'IWM:SPY',   desc: 'Small cap vs large — cycle breadth' },
                { key: 'UUP:SPY',   desc: 'Dollar vs equities — invert for risk-on', invert: true },
                { key: 'RSP:SPY',   desc: 'Equal weight vs cap-weight — breadth' },
                { key: 'ITB:IEF',   desc: 'Homebuilders vs bonds — rate sensitivity' },
            ]

            // Look up each pair in upload data across timeframes
            const lookup = (key, tf) => {
                const r = allRows.find(r => (r.key || '').toUpperCase() === key.toUpperCase())
                return r ? r[tf] : undefined
            }
            // Status logic: uses 1M as primary, 3M as confirmation
            const getStatus = (sp, v5d, v1m, v3m) => {
                if(v1m === undefined && v5d === undefined) return { text: '—', cls: 'neutral' }
                const pri   = v1m !== undefined ? v1m : v5d
                const sec   = v3m
                const bull  = sp.invert ? pri < 0 : pri > 0
                const bear  = sp.invert ? pri > 0 : pri < 0
                const weakSec = sec !== undefined && (sp.invert ? sec > 0 : sec < 0)
                if(bull && !weakSec)           return { text: '▲ BULLISH', cls: 'bull' }
                if(bull && weakSec)            return { text: '⚠ WATCH — 3M weak', cls: 'watch' }
                if(bear && sp.key === 'UUP:SPY') return { text: '▼ BULLISH (weak $)', cls: 'bull' }
                if(bear)                       return { text: '▼ BEARISH', cls: 'bear' }
                return { text: '~ NEUTRAL', cls: 'neutral' }
            }

            // Build 8-row signal table
            const sigRowsHtml = SIGNAL_PAIRS.map(sp => {
                const v5d = lookup(sp.key, '5d') ?? lookup(sp.key, '1d')
                const v1m = lookup(sp.key, '1m')
                const v3m = lookup(sp.key, '3m')
                const v1y = lookup(sp.key, '1y')
                const status = getStatus(sp, v5d, v1m, v3m)
                const td = (v) => `<td>${v !== undefined ? pct(v) : '—'}</td>`
                const statusCls = status.cls === 'bull' ? 'sig-bull' : status.cls === 'bear' ? 'sig-bear' : status.cls === 'watch' ? 'sig-watch' : 'sig-neutral'
                return (
                    `<tr>` +
                    `<td><span class="sig-pair-name">${sp.key}</span><span class="sig-pair-desc">${sp.desc}</span></td>` +
                    td(v5d) + td(v1m) + td(v3m) + td(v1y) +
                    `<td><span class="sig-status ${statusCls}">${status.text}</span></td>` +
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

            return (
                moduleHeader('05 · Liquidity Rotation Signals', liqHeadline, liqBadgeText, liqBadge) +
                `<h2 class="pb-h2">Risk-On vs Risk-Off Barometers</h2>` +
                `<p class="pb-intro">Eight fixed signal pairs measuring risk appetite across credit, EM, semis, dollar, and breadth dimensions.</p>` +
                (state ? compassBlock(state, 'Liquidity state') : '') +
                `<div class="pb-section">` +
                `<div class="pb-section-label">State snapshot</div>` +
                liqGrid(statCells) +
                `</div>` +
                `<div class="pb-section">` +
                `<div class="pb-section-label">Signal pairs — 5D · 1M · 3M · 1Y · Status</div>` +
                sigTableHtml +
                `</div>` +
                dominoBlock(
                    'Gate: thesis confirming',
                    liqCont
                        ? 'Liquidity contracting — reduce exposure until state inflects.'
                        : 'Liquidity supportive — proceed to Risk Management (06) for sizing rules.'
                ) +
                (asOf ? `<div class="detail-section"><div style="opacity:0.4;font-size:11px">as of ${asOf}</div></div>` : '')
            )
        }
    },
    {
        id: '6', idx: 5, clickable: true, route: null, title: '06 · Risk Management',
        position: new THREE.Vector3(0.8, - 2.0, - 0.7),
        populate: (d) =>
        {
            const r0 = strip((d.risks_or_watchpoints || [])[0]).split('.')[0]
            const e0 = strip((d.best_expressions || [])[0]).split('.')[0]
            setHtml('.point-5 .text',
                `Watch: ${r0}<br>` +
                (e0 ? `<span class="point-meta">${e0}</span>` : ''))
        },
        render: (data) =>
        {
            const changed  = strip(data.what_changed)
            const liqRot   = data.liquidity_rotation || {}
            const indRot   = data.industry_rotation  || {}
            const liqAllRows = liqFullRows.length ? liqFullRows : (liqRot.top_by_1w || [])
            const indB1w   = ((indRot.breadth || {})['1w'] || {}).pct_positive
            const noRev    = !['reversal', 'breakdown', 'breaking', 'no longer'].some(w => changed.toLowerCase().includes(w))

            // Lookup helper for liquidity basket
            const liqLookup = (key, tf) => {
                const r = liqAllRows.find(r => (r.key || '').toUpperCase() === key.toUpperCase())
                return r ? r[tf] : undefined
            }
            const statusFromVal = (v) => {
                if(v === undefined) return { cls: 'neutral', txt: '—' }
                return v > 0 ? { cls: 'bull', txt: pct(v) } : v < 0 ? { cls: 'bear', txt: pct(v) } : { cls: 'neutral', txt: '0%' }
            }

            // STATIC red flags — exact playbook section 06 contract
            const RED_FLAGS = [
                { ticker: 'HYG:IEF',           desc: 'Credit spreads widening — risk-off signal',        trigger: 'Crosses below 50-day MA or turns negative 1m' },
                { ticker: 'UUP:SPY',            desc: 'Dollar surging vs equities — global tightening',   trigger: 'DXY sustained surge + EM selling' },
                { ticker: 'ISM Breadth',         desc: 'Manufacturing breadth deteriorating',              trigger: 'Drops below 45% or prints 2nd consecutive miss' },
                { ticker: 'EEM:SPY',             desc: 'EM underperforming US — global risk appetite off', trigger: '1m negative + 3m negative = avoid EM' },
                { ticker: 'Unemployment Breadth',desc: 'Jobless claims breadth turning',                  trigger: 'Initial claims 4-week MA rising >10%' },
                { ticker: 'Oil USO',             desc: 'Oil spike disrupting margins and sentiment',       trigger: 'USO +20% in 3m or WTI >$95' },
            ]

            // STATIC green flags — exact playbook section 06 contract
            const GREEN_FLAGS = [
                { ticker: 'SOXX:QQQ',     desc: 'Semis outperforming tech — capex cycle intact',     target: 'SOXX:QQQ 1m positive' },
                { ticker: 'ISM Breadth',  desc: 'Manufacturing breadth expanding — mid-cycle',       target: '>55% positive = expansion signal' },
                { ticker: '1M Breadth',   desc: 'Industry breadth confirming — broad participation', target: '>60% of sectors positive 1m' },
                { ticker: 'OIH/HAL/SLB', desc: 'Energy services acting well — cycle support',       target: 'All three > +5% 1m' },
                { ticker: 'EEM:IEF',      desc: 'EM outperforming bonds — global risk-on',           target: '1m positive + trend improving' },
                { ticker: 'HYG:IEF',      desc: 'Credit spreads compressing — liquidity unlocked',   target: 'Positive 1m and 3m = full size' },
            ]

            // Populate dynamic status on red flags from upload data
            const redItems = RED_FLAGS.map(rf => {
                let dynStatus = ''
                if(rf.ticker === 'HYG:IEF') {
                    const v = liqLookup('HYG:IEF', '1m')
                    if(v !== undefined) dynStatus = v < 0 ? ' — ACTIVE ⚠' : ' — OK'
                }
                if(rf.ticker === 'EEM:SPY') {
                    const v = liqLookup('EEM:SPY', '1m')
                    if(v !== undefined) dynStatus = v < 0 ? ' — ACTIVE ⚠' : ' — OK'
                }
                return { ticker: rf.ticker, desc: rf.desc + dynStatus, trigger: rf.trigger }
            })

            // Populate dynamic status on green flags from upload data
            const greenItems = GREEN_FLAGS.map(gf => {
                let dynStatus = ''
                if(gf.ticker === '1M Breadth') {
                    if(indB1w !== undefined) dynStatus = indB1w >= 60 ? ' — CONFIRMED' : indB1w >= 50 ? ' — MARGINAL' : ' — BELOW TARGET'
                }
                if(gf.ticker === 'HYG:IEF') {
                    const v = liqLookup('HYG:IEF', '1m')
                    if(v !== undefined) dynStatus = v > 0 ? ' — CONFIRMED' : ' — BELOW TARGET'
                }
                if(gf.ticker === 'EEM:IEF') {
                    const v = liqLookup('EEM:IEF', '1m')
                    if(v !== undefined) dynStatus = v > 0 ? ' — CONFIRMED' : ' — WATCH'
                }
                return { ticker: gf.ticker, desc: gf.desc + dynStatus, trigger: gf.target }
            })

            // STATIC watchlist rows — exact playbook section 06 contract, 9 rows
            const hyg1m = liqLookup('HYG:IEF', '1m')
            const eem1m = liqLookup('EEM:SPY', '1m')
            const iwm1m = liqLookup('IWM:SPY', '1m')
            const uup1m = liqLookup('UUP:SPY', '1m')
            const soxx1m = liqLookup('SOXX:QQQ', '1m')
            const eeib1m = liqLookup('EEM:IEF', '1m')
            const itb1m  = liqLookup('ITB:IEF', '1m')
            const rsp1m  = liqLookup('RSP:SPY', '1m')

            const watchRows = [
                { pair: 'HYG:IEF',   status: statusFromVal(hyg1m).cls,  label: statusFromVal(hyg1m).txt,  note: 'Credit signal — core watch' },
                { pair: 'EEM:SPY',   status: statusFromVal(eem1m).cls,   label: statusFromVal(eem1m).txt,  note: 'Global risk appetite' },
                { pair: 'IWM:SPY',   status: statusFromVal(iwm1m).cls,   label: statusFromVal(iwm1m).txt,  note: 'Breadth / cycle proxy' },
                { pair: 'UUP:SPY',   status: uup1m !== undefined ? (uup1m < 0 ? 'bull' : 'bear') : 'neutral',  label: uup1m !== undefined ? pct(uup1m) : '—',  note: 'Dollar — invert for risk-on' },
                { pair: 'SOXX:QQQ',  status: statusFromVal(soxx1m).cls,  label: statusFromVal(soxx1m).txt, note: 'Semis vs tech — AI cycle' },
                { pair: 'EEM:IEF',   status: statusFromVal(eeib1m).cls,  label: statusFromVal(eeib1m).txt, note: 'EM vs bonds — global risk-on' },
                { pair: 'ITB:IEF',   status: statusFromVal(itb1m).cls,   label: statusFromVal(itb1m).txt,  note: 'Housing vs bonds — rate sensitivity' },
                { pair: 'RSP:SPY',   status: statusFromVal(rsp1m).cls,   label: statusFromVal(rsp1m).txt,  note: 'Equal wt vs cap wt — breadth quality' },
                { pair: 'ISM Breadth', status: indB1w !== undefined ? (indB1w >= 55 ? 'bull' : indB1w < 45 ? 'bear' : 'neutral') : 'neutral',
                    label: indB1w !== undefined ? indB1w + '%' : '—', note: 'Manufacturing breadth — cycle stage' },
            ]

            const riskLevel = noRev ? 'Active' : 'Elevated'
            const riskBadge = noRev ? 'neutral' : 'bear'
            const headline  = 'Active monitoring · triggers · watchlist'

            return (
                moduleHeader('06 · Risk Management', headline, riskLevel, riskBadge) +
                `<h2 class="pb-h2">What To Monitor</h2>` +
                `<p class="pb-intro">Fixed red and green flag conditions. Status updates when upload data is loaded.</p>` +
                riskPanelPb(redItems, greenItems) +
                `<div class="pb-section">` +
                `<div class="pb-section-label">Weekly watchlist — 9 instruments</div>` +
                ratioTable(watchRows) +
                `</div>` +
                dominoBlock(
                    null,
                    noRev
                        ? 'Driver intact — monitor triggers weekly. Trim if two red flags activate simultaneously.'
                        : 'Driver shift detected — reduce first, reassess before adding.'
                )
            )
        }
    },
    {
        id: '7', idx: 6, clickable: true, route: null, title: '07 · Structural Risks',
        position: new THREE.Vector3(- 0.5, - 1.5, - 1.8),
        populate: (d) =>
        {
            const r0 = strip((d.risks_or_watchpoints || [])[0]).split('.')[0]
            const r1 = strip((d.risks_or_watchpoints || [])[1]).split('.')[0]
            setHtml('.point-6 .text',
                `${r0}<br>` +
                (r1 ? `<span class="point-meta">${r1}</span>` : ''))
        },
        render: (data) =>
        {
            // STATIC structural risk scenarios — exact playbook section 07 contract
            // 6 fixed scenarios, numbered, two-col layout (3 left, 3 right)
            const STRUCTURAL_RISKS = [
                { n: 1, title: 'Oil Price Spike',          severity: 'red',   desc: 'Sustained move above $95 WTI disrupts margins, compresses consumer, and forces Fed hawkishness. Energy costs bleed into ISM and earnings.' },
                { n: 2, title: 'Tariff Escalation',        severity: 'red',   desc: 'Renewed trade barriers compress EM earnings and global supply chains. Dollar strength feedback loop: tighter global liquidity.' },
                { n: 3, title: 'Fed Policy Reversal',      severity: 'red',   desc: 'Inflation re-acceleration forces Fed to signal rate hikes. Real yield spike triggers multiple compression across growth assets.' },
                { n: 4, title: 'Credit Dislocation',       severity: 'red',   desc: 'HYG:IEF spread breakout or IG widening signals credit cycle roll. Shadow banking or levered vehicle stress amplifies.' },
                { n: 5, title: 'Geopolitical Escalation',  severity: 'red',   desc: 'Middle East or Taiwan shock triggers oil spike + safe haven flows. Risk assets reset lower; breadth collapses within sessions.' },
                { n: 6, title: 'Breadth Fails to Expand',  severity: 'amber', desc: 'Market rally narrows to 5-10 mega caps. IWM:SPY turns negative; RSP:SPY lags. Signal: rotation thesis is not confirmed.' },
            ]

            const leftCol  = STRUCTURAL_RISKS.slice(0, 3)
            const rightCol = STRUCTURAL_RISKS.slice(3)

            const scenarioCard = (s) =>
                `<div class="struct-risk-card struct-risk-card--${s.severity}">` +
                `<div class="struct-risk-n">${s.n}</div>` +
                `<div class="struct-risk-body">` +
                `<div class="struct-risk-title">${s.title}</div>` +
                `<div class="struct-risk-desc">${s.desc}</div>` +
                `</div>` +
                `</div>`

            const twoColHtml =
                `<div class="struct-risk-grid">` +
                `<div class="struct-risk-col">${leftCol.map(scenarioCard).join('')}</div>` +
                `<div class="struct-risk-col">${rightCol.map(scenarioCard).join('')}</div>` +
                `</div>`

            return (
                moduleHeader('07 · Structural Risks', 'Six scenarios that could break the view', 'Watch', 'neutral') +
                `<h2 class="pb-h2">What Could Break This View</h2>` +
                `<p class="pb-intro">These are regime-invalidating scenarios. If any fires, exit expressions first, then return to Regime State.</p>` +
                twoColHtml +
                (data.previous_issue ? `<div class="pb-section"><div class="detail-prose" style="opacity:0.5;font-size:11px">vs prior: ${priorDate(data.previous_issue)}</div></div>` : '') +
                dominoBlock(null, 'If any structural trigger fires: exit expressions first, return to Regime State (01).')
            )
        }
    },
    {
        id: '8', idx: 7, clickable: false, route: null, title: 'Sources',
        position: new THREE.Vector3(- 1.2, 1.2, - 1.6),
        populate: (d) =>
        {
            const ld = d.liquidity_rotation
            const ir = d.industry_rotation
            const mr = d.master_rotation
            const asOf = (ld || ir || mr || {}).as_of || ''
            setHtml('.point-7 .text',
                `MIT ${issueDate(d.current_issue)}<br>` +
                `vs ${priorDate(d.previous_issue)} prior<br>` +
                `<span class="point-meta">Rotation ${asOf}</span>`)
        },
        render: null
    }
]

/**
 * MIT Brief — fetch and populate
 */
const populateBrief = (d) =>
{
    POINTS.forEach(cfg => cfg.populate(d))

    // Topbar seal: first sentence of regime_view
    const sealEl  = document.getElementById('sealText')
    const issueEl = document.getElementById('tbIssue')
    if(sealEl && d.regime_view)
    {
        const first = strip(d.regime_view).split('.')[0].slice(0, 64)
        sealEl.textContent = first
    }
    if(issueEl) issueEl.textContent = issueDate(d.current_issue)
}

/**
 * State ring computation — derives confirming/caution/neutral for each point
 * and applies as data-state attribute on .point-N elements.
 * Rotation-backed points (2,4,5) use breadth thresholds.
 * Brief-backed points use regime_view sentiment + risk count.
 */
const computePointStates = (bd) =>
{
    const liq     = bd.liquidity_rotation || {}
    const ind     = bd.industry_rotation  || {}
    const mst     = bd.master_rotation    || {}
    const rv      = strip(bd.regime_view  || '').toLowerCase()
    const liqState = (liq.liquidity_state || '').toLowerCase()
    const liqConf  = liqState.includes('expand') || liqState.includes('rising') || liqState.includes('easy')
    const liqCaut  = liqState.includes('contract') || liqState.includes('tight') || liqState.includes('falling')

    const indB1w  = ((ind.breadth || {})['1w'] || {}).pct_positive
    const indConf = typeof indB1w === 'number' && indB1w >= 60
    const indCaut = typeof indB1w === 'number' && indB1w < 40

    const mstB1m  = ((mst.breadth || {})['1m'] || {}).pct_positive
    const mstConf = typeof mstB1m === 'number' && mstB1m >= 55
    const mstCaut = typeof mstB1m === 'number' && mstB1m < 40

    const rvConf = rv.includes('risk on') || rv.includes('expansion') || rv.includes('bull') || rv.includes('accelerat') || rv.includes('recovery')
    const rvCaut = rv.includes('risk off') || rv.includes('contract') || rv.includes('recession') || rv.includes('tighten') || rv.includes('slowdown')

    const states = {
        '1': rvCaut ? 'caution' : rvConf ? 'confirming' : 'neutral',              // 01 Regime State — MIT brief
        '2': rvCaut ? 'caution' : rvConf ? 'confirming' : 'neutral',              // 02 Investment Commands — MIT brief
        '3': indCaut ? 'caution' : indConf ? 'confirming' : 'neutral',            // 03 Sector Clusters — industry upload
        '4': mstCaut ? 'caution' : mstConf ? 'confirming' : 'neutral',            // 04 Momentum Leaders — master upload
        '5': liqCaut ? 'caution' : liqConf ? 'confirming' : 'neutral',            // 05 Liquidity Signals — liquidity upload
        '6': rvCaut ? 'caution' : rvConf ? 'confirming' : 'neutral',              // 06 Risk Management — MIT brief
        '7': (() => { const riskText = (bd.risks_or_watchpoints || []).slice(0, 3).join(' ').toLowerCase(); return (riskText.includes('elevated') || riskText.includes('accelerat') || riskText.includes('material') || riskText.includes('significant') || riskText.includes('trigger') || riskText.includes('breaking') || riskText.includes('deteriorat')) ? 'caution' : 'neutral' })(),
        '8': 'neutral',
    }

    POINTS.forEach(cfg =>
    {
        const el = document.querySelector(`.point-${cfg.idx}`)
        if(el) el.dataset.state = states[cfg.id] || 'neutral'
    })
}

// Set loading state while fetch is in flight
document.querySelectorAll('.point .text').forEach(el => { el.textContent = '...' })

let briefData    = null
let liqFullRows  = []   // full liquidity basket rows — populated in parallel with brief

const refreshBrief = () =>
    Promise.all([
        fetch('/api/brief')
            .then(res => { if(!res.ok) throw new Error(res.status); return res.json() }),
        fetch('/api/rotation/liquidity/latest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
    ])
        .then(([briefJson, liqJson]) =>
        {
            briefData = briefJson
            if(liqJson && Array.isArray(liqJson.rows)) liqFullRows = liqJson.rows
            populateBrief(briefJson)
            computePointStates(briefJson)
        })
        .catch(() =>
        {
            document.querySelectorAll('.point .text').forEach(el =>
            {
                el.textContent = 'Data unavailable.'
            })
        })

refreshBrief()

/**
 * Scene points — built from POINTS config
 * idx is the DOM bridge (.point-N class): retired in Stage 2 when points get named classes
 */
const raycaster = new THREE.Raycaster()
const scenePoints = POINTS.map(cfg => ({
    position: cfg.position,
    element: document.querySelector(`.point-${cfg.idx}`)
}))

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera — FOV 45, 11% closer than initial 7.23u framing to feel more dominant
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100)
camera.position.set(4.5, 1.35, - 4.5)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.minDistance = 3.5
controls.maxDistance = 12

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Slowly rotate Earth — creates a living globe feel
    earth.rotation.y = elapsedTime * 0.05

    // Update controls
    controls.update()

    // Update points only when the scene is ready
    if(sceneReady)
    {
        // Go through each point
        for(const point of scenePoints)
        {
            // Get 2D screen position
            const screenPosition = point.position.clone()
            screenPosition.project(camera)

            // Raycast only against the Earth sphere (not atmosphere or overlay)
            raycaster.setFromCamera(screenPosition, camera)
            const intersects = raycaster.intersectObject(earth, false)

            // No intersect — point is in front of Earth
            if(intersects.length === 0)
            {
                point.element.classList.add('visible')
            }
            else
            {
                // Compare intersection distance vs point distance from camera
                const intersectionDistance = intersects[0].distance
                const pointDistance = point.position.distanceTo(camera.position)

                if(intersectionDistance < pointDistance)
                {
                    // Earth is between camera and point — hide
                    point.element.classList.remove('visible')
                }
                else
                {
                    // Point is in front of Earth — show
                    point.element.classList.add('visible')
                }
            }

            const translateX = screenPosition.x * sizes.width * 0.5
            const translateY = - screenPosition.y * sizes.height * 0.5
            point.element.style.transform = `translateX(${translateX}px) translateY(${translateY}px)`
        }
    }

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

/**
 * Upload
 */
const uploadToggle = document.getElementById('uploadToggle')
const uploadPanel  = document.getElementById('uploadPanel')

uploadToggle.addEventListener('click', () => { uploadPanel.classList.toggle('open') })

const _laneStatusEls = {
    liquidity: () => document.getElementById('statusLiquidity'),
    industry:  () => document.getElementById('statusIndustry'),
    master:    () => document.getElementById('statusMaster'),
}

const uploadFile = (file, statusEl) =>
{
    statusEl.textContent = '…'
    const fd = new FormData()
    fd.append('file', file)
    fetch('/api/rotation/upload', { method: 'POST', body: fd })
        .then(res =>
        {
            if(!res.ok) return res.json().then(body =>
            {
                const det = body?.detail
                const msg = typeof det === 'object' ? (det.detected || 'Unknown') : (det || res.status)
                statusEl.textContent = `⚠ ${String(msg).slice(0, 32)}`
                throw new Error('unrouted')
            })
            return res.json()
        })
        .then(data =>
        {
            // Route the success tick to the correct lane status element
            const targetFn = _laneStatusEls[data.lane]
            const targetEl = targetFn ? targetFn() : statusEl
            if(targetEl !== statusEl) statusEl.textContent = ''
            targetEl.textContent = '✓'
            window.setTimeout(refreshBrief, 600)
        })
        .catch(err => { if(err.message !== 'unrouted') statusEl.textContent = '✗' })
}

document.getElementById('uploadIndustry').addEventListener('change', (e) =>
{
    if(e.target.files[0])
        uploadFile(e.target.files[0], document.getElementById('statusIndustry'))
})

document.getElementById('uploadLiquidity').addEventListener('change', (e) =>
{
    if(e.target.files[0])
        uploadFile(e.target.files[0], document.getElementById('statusLiquidity'))
})

document.getElementById('uploadMaster').addEventListener('change', (e) =>
{
    if(e.target.files[0])
        uploadFile(e.target.files[0], document.getElementById('statusMaster'))
})

/**
 * Detail panel (click-to-expand)
 */
const detailPanel   = document.getElementById('detailPanel')
const detailTitle   = document.getElementById('detailTitle')
const detailBody    = document.getElementById('detailBody')
const detailClose   = document.getElementById('detailClose')
const modalBackdrop = document.getElementById('modalBackdrop')

let openPointId = ''

const closeDetail = () =>
{
    gsap.killTweensOf(Array.from(detailBody.children))
    detailPanel.classList.remove('open')
    modalBackdrop.classList.remove('open')
    openPointId = ''
    document.querySelectorAll('.point .label').forEach(el => el.classList.remove('active'))
}

detailClose.addEventListener('click', closeDetail)
modalBackdrop.addEventListener('click', closeDetail)

document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeDetail() })

const renderDetail = (cfg, data) =>
{
    const html = cfg.render(data, briefData)
    gsap.killTweensOf(Array.from(detailBody.children))
    detailTitle.textContent = cfg.title
    detailBody.innerHTML    = html
    detailPanel.classList.add('open')
    modalBackdrop.classList.add('open')
    gsap.from(Array.from(detailBody.children), {
        opacity: 0, y: 8, duration: 0.28, stagger: 0.06, clearProps: 'all'
    })
}

const fetchAndOpen = (cfg) =>
{
    if(openPointId === cfg.id) { closeDetail(); return }
    openPointId = cfg.id
    document.querySelectorAll('.point .label').forEach(el => el.classList.remove('active'))
    document.querySelector(`.point-${cfg.idx} .label`)?.classList.add('active')

    if(!cfg.route)
    {
        // Brief-backed points: ST, CH, BR
        if(briefData) { renderDetail(cfg, briefData); return }
        detailTitle.textContent = cfg.title
        detailBody.innerHTML    = '<div style="opacity:0.45;padding:20px 0">Loading…</div>'
        detailPanel.classList.add('open')
        modalBackdrop.classList.add('open')
        return
    }

    detailTitle.textContent = cfg.title
    detailBody.innerHTML    = '<div style="opacity:0.45;padding:20px 0">Loading…</div>'
    detailPanel.classList.add('open')
    modalBackdrop.classList.add('open')

    fetch(cfg.route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .then(res => { if(!res.ok) throw new Error(res.status); return res.json() })
        .then(data => { if(openPointId === cfg.id) renderDetail(cfg, data) })
        .catch((err) =>
        {
            if(openPointId === cfg.id)
            {
                if(err.message === '404' && cfg.emptyMsg)
                    detailBody.innerHTML =
                        `<div class="detail-section">` +
                        `<div class="detail-prose" style="opacity:0.5">${cfg.emptyMsg}</div>` +
                        `</div>`
                else
                    detailBody.innerHTML = '<div style="opacity:0.45">Unavailable.</div>'
            }
        })
}

// Config-driven click registration — all clickable points including CH and BR
POINTS.filter(p => p.clickable).forEach(cfg =>
{
    const label = document.querySelector(`.point-${cfg.idx} .label`)
    if(label) label.addEventListener('click', (e) => { e.stopPropagation(); fetchAndOpen(cfg) })
})

/**
 * Ask MIT
 */
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

const setMode = (mode) =>
{
    askMode = mode
    if(mode === 'report')
    {
        modeReport.classList.add('active')
        modeQuick.classList.remove('active')
        askInput.placeholder = 'Report topic — uses full brief + rotation context…'
    }
    else
    {
        modeQuick.classList.add('active')
        modeReport.classList.remove('active')
        askInput.placeholder = 'Ask a focused macro question…'
    }
}

modeQuick.addEventListener('click',  () => setMode('quick'))
modeReport.addEventListener('click', () => setMode('report'))

presetToggle.addEventListener('click', () =>
{
    askPresets.classList.toggle('open')
    presetToggle.classList.toggle('active')
})

// ── E: Quick mode brief framing ───────────────────────────────────────────────
const buildQuickContext = (q) =>
{
    if(!briefData) return q
    const regimeShort = strip(briefData.regime_view).split('.')[0]
    const d0          = strip((briefData.key_drivers || [])[0])
    return `[MIT context: ${regimeShort}. Primary driver: ${d0}]\n\n${q}`
}

// ── D: Full rotation context builder ──────────────────────────────────────────
const buildReportContext = () =>
{
    if(!briefData) return ''
    const bd  = briefData
    const liq = bd.liquidity_rotation || {}
    const ind = bd.industry_rotation  || {}
    const mst = bd.master_rotation    || {}

    const liqL1w = (liq.top_by_1w || []).slice(0, 5).filter(r => r.key).map(r => `${r.key} ${pct(r['1w'])}`).join(', ')
    const liqL1m = (liq.top_by_1m || []).slice(0, 3).filter(r => r.key).map(r => `${r.key} ${pct(r['1m'])}`).join(', ')
    const indL1w = (ind.top_by_1w || []).slice(0, 5).filter(r => r.key || r.name).map(r => `${r.key || r.name} ${pct(r['1w'])}`).join(', ')
    const indL1m = (ind.top_by_1m || []).slice(0, 3).filter(r => r.key || r.name).map(r => `${r.key || r.name} ${pct(r['1m'])}`).join(', ')
    const indB1w = ((ind.breadth || {})['1w'] || {}).pct_positive
    const indB1m = ((ind.breadth || {})['1m'] || {}).pct_positive
    const mstL1m = (mst.top_by_1m || []).slice(0, 5).filter(r => r.key).map(r => `${r.key} ${pct(r['1m'], 0)}`).join(', ')
    const mstL3m = (mst.top_by_3m || []).slice(0, 3).filter(r => r.key).map(r => `${r.key} ${pct(r['3m'], 0)}`).join(', ')
    const mstB1m = ((mst.breadth || {})['1m'] || {}).pct_positive
    const mstB3m = ((mst.breadth || {})['3m'] || {}).pct_positive

    // Only include rotation sections if the snapshot has actual data
    const hasLiq = !!(liq.liquidity_state || liqL1w)
    const hasInd = !!(ind.expression_takeaway || indL1w)
    const hasMst = !!(mst.ranking_summary || mstL1m)

    const liqSection = hasLiq ? [
        '',
        `=== Uploaded Liquidity Snapshot ===`,
        liq.liquidity_state ? `State: ${liq.liquidity_state}` : null,
        typeof liq.avg_1m === 'number' ? `Avg returns — 1d: ${pct(liq.avg_1d)}, 1m: ${pct(liq.avg_1m)}, 3m: ${pct(liq.avg_3m)}` : null,
        liqL1w ? `Leaders 1w: ${liqL1w}` : null,
        liqL1m ? `Leaders 1m: ${liqL1m}` : null,
    ] : [``, `=== Uploaded Liquidity Snapshot: not yet loaded ===`]

    const indSection = hasInd ? [
        '',
        `=== Uploaded Industry Rotation Snapshot ===`,
        ind.expression_takeaway ? `Takeaway: ${strip(ind.expression_takeaway)}` : null,
        indL1w ? `Leaders 1w: ${indL1w}` : null,
        indL1m ? `Leaders 1m: ${indL1m}` : null,
        indB1w !== undefined ? `Breadth 1w: ${indB1w}%` : null,
        indB1m !== undefined ? `Breadth 1m: ${indB1m}%` : null,
    ] : [``, `=== Uploaded Industry Rotation Snapshot: not yet loaded ===`]

    const mstSection = hasMst ? [
        '',
        `=== Uploaded Master Leadership Snapshot ===`,
        mst.ranking_summary ? `Summary: ${strip(mst.ranking_summary)}` : null,
        mstL1m ? `Leaders 1m: ${mstL1m}` : null,
        mstL3m ? `Leaders 3m: ${mstL3m}` : null,
        mstB1m !== undefined ? `Breadth 1m: ${mstB1m}%` : null,
        mstB3m !== undefined ? `Breadth 3m: ${mstB3m}%` : null,
    ] : [``, `=== Uploaded Master Leadership Snapshot: not yet loaded ===`]

    return [
        `=== MIT Brief: ${issueDate(bd.current_issue)} vs ${priorDate(bd.previous_issue)} prior ===`,
        `Regime: ${strip(bd.regime_view)}`,
        `Summary: ${strip(bd.summary)}`,
        `What changed: ${strip(bd.what_changed)}`,
        `Key drivers: ${(bd.key_drivers || []).slice(0, 6).map(strip).join('; ')}`,
        `Best expressions: ${(bd.best_expressions || []).slice(0, 5).map(strip).join('; ')}`,
        `Risks: ${(bd.risks_or_watchpoints || []).slice(0, 4).map(strip).join('; ')}`,
        ...liqSection,
        ...indSection,
        ...mstSection,
    ].filter(s => s !== null).join('\n')
}

// ── D: Intent-specific report templates ───────────────────────────────────────
const REPORT_TEMPLATES = {
    'Write the weekly MIT note': (ctx) =>
        `${ctx}\n\nWrite the weekly MIT Expression Note. Structure:\n` +
        `1) Thesis — state the current MIT regime view clearly\n` +
        `2) What Changed — key shift from the prior issue\n` +
        `3) Liquidity Reading — what the uploaded snapshot shows and how it reads against the thesis\n` +
        `4) Industry & Leadership — what the uploaded rotation and master snapshots show\n` +
        `5) Best Expressions — top 3 specific trades with rationale\n` +
        `6) Risk Watch — what breaks the view, what to monitor\n` +
        `Use specific numbers from the uploaded snapshots. Tone: calm, analytical, MIT-anchored.`,

    'Write the confirmation report': (ctx) =>
        `${ctx}\n\nWrite a structured confirmation report. Structure:\n` +
        `1) Confirms — what in the uploaded rotation data confirms MIT's thesis (specific numbers required)\n` +
        `2) Cautions — what in the uploaded rotation data is inconsistent with the thesis\n` +
        `3) Net Assessment — how strong is the overall confirmation, and what drives the verdict\n` +
        `4) Key Monitor — the single most important data point to watch going forward\n` +
        `The uploaded snapshots must materially drive the verdict. Tone: precise, evidence-based.`,

    'Write a plain-English interpretation': (ctx) =>
        `${ctx}\n\nWrite a plain-English interpretation for someone less experienced with macro. Structure:\n` +
        `1) What MIT is saying — 2 simple sentences, no jargon\n` +
        `2) What the rotation data shows — describe what the uploaded snapshots tell us, simply\n` +
        `3) What this means for portfolios — actionable, plain language\n` +
        `4) What could go wrong — 2–3 sentences on risk\n` +
        `Avoid acronyms and technical jargon. Tone: clear, calm, instructive.`,

    'Write a tactical regime card': (ctx) =>
        `${ctx}\n\nWrite a tactical regime card in exactly this format:\n` +
        `Regime: [one phrase]\n` +
        `Driver: [primary force, max 10 words]\n` +
        `Liquidity: [state + 1-month avg return from uploaded snapshot]\n` +
        `Rotation signal: [leading industry from uploaded industry snapshot]\n` +
        `Top expression: [best single trade from MIT brief]\n` +
        `Stop condition: [what breaks the thesis, max 10 words]\n` +
        `No prose paragraphs. Six lines only. Use exact numbers from the snapshots.`,
}

const buildReportPrompt = (question) =>
{
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

const submitAsk = () =>
{
    const q = askInput.value.trim()
    if(!q) return

    askAnswer.textContent  = askMode === 'report' ? 'Generating…' : 'Searching MIT research…'
    askAnswer.classList.add('streaming')
    askSources.textContent = ''
    askSubmit.disabled     = true

    if(askMode === 'report')
    {
        // ── Streaming path (report mode) ─────────────────────────────────────
        fetch('/api/ask/stream', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ question: buildReportPrompt(q), limit: 8, report: true })
        })
        .then(res => { if(!res.ok) throw new Error(res.status); return res.body.getReader() })
        .then(reader =>
        {
            let firstChunk = true
            const dec = new TextDecoder()
            let buf   = ''

            const pump = () => reader.read().then(({ done, value }) =>
            {
                if(done) { askAnswer.classList.remove('streaming'); askSubmit.disabled = false; return }
                buf += dec.decode(value, { stream: true })
                const parts = buf.split('\n\n')
                buf = parts.pop()
                for(const part of parts)
                {
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
        .catch(() =>
        {
            askAnswer.classList.remove('streaming')
            askAnswer.textContent = 'Unavailable.'
            askSubmit.disabled    = false
        })
    }
    else
    {
        // ── Quick path (non-streaming) ────────────────────────────────────────
        fetch('/api/ask', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ question: buildQuickContext(q), limit: 4, report: false })
        })
        .then(res => { if(!res.ok) throw new Error(res.status); return res.json() })
        .then(data =>
        {
            askAnswer.classList.remove('streaming')
            askAnswer.textContent  = data.answer || '—'
            askSources.textContent = fmtSources(data.sources)
        })
        .catch(() => { askAnswer.classList.remove('streaming'); askAnswer.textContent = 'Unavailable.' })
        .finally(() => { askSubmit.disabled = false })
    }
}

askSubmit.addEventListener('click', submitAsk)
askInput.addEventListener('keydown', (e) =>
{
    if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAsk() }
})

askPresets.querySelectorAll('.preset-pill').forEach(pill =>
{
    pill.addEventListener('click', () =>
    {
        setMode(pill.dataset.mode || 'quick')
        askInput.value = pill.dataset.q
        askPresets.classList.remove('open')
        presetToggle.classList.remove('active')
        submitAsk()
    })
})

// Ticker chip: click to copy symbol to clipboard
detailBody.addEventListener('click', (e) =>
{
    const chip = e.target.closest('.ticker-chip')
    if(!chip) return
    const orig = chip.textContent.trim()
    navigator.clipboard?.writeText(orig).catch(() => {})
    chip.textContent = '✓'
    window.setTimeout(() => { chip.textContent = orig }, 900)
})

tick()