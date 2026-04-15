/**
 * Compression Studio — entrypoint
 *
 * Layer 1 (Measurements):  state/store.js + uploads.js
 * Layer 2 (Interpretation): state/store.js (MIT brief) + ask.js
 * Layer 3 (Compression):   points/index.js + renderers/components.js
 * Layer 4 (Surface):       scene.js + this file (detail panel wiring)
 */
import { gsap } from 'gsap'
import { briefData, refreshBrief } from './state/store.js'
import { POINTS } from './points/index.js'
import { initScene } from './scene.js'
import { initUploads } from './uploads.js'
import { initAsk } from './ask.js'

// Set loading state while fetch is in flight
document.querySelectorAll('.point .text').forEach(el => { el.textContent = '...' })

// Fetch MIT brief + liquidity snapshot
refreshBrief(POINTS)

// Initialize scene (Earth, atmosphere, camera, tick loop)
initScene(POINTS)

// Initialize uploads panel
initUploads(POINTS)

// Initialize Ask MIT panel
initAsk()

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

// Config-driven click registration
POINTS.filter(p => p.clickable).forEach(cfg =>
{
    const label = document.querySelector(`.point-${cfg.idx} .label`)
    if(label) label.addEventListener('click', (e) => { e.stopPropagation(); fetchAndOpen(cfg) })
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
