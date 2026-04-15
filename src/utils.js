// DOM helpers
export const setText = (selector, text) => {
    const el = document.querySelector(selector)
    if(el) el.textContent = text
}

export const setHtml = (selector, html) => {
    const el = document.querySelector(selector)
    if(el) el.innerHTML = html
}

// Strip citation codes like (C3) (P1) that bleed through from the brief
export const strip = (s) => (s || '').replace(/\s*\([CP]\d+\)/g, '').trim()

// Signed percentage string with fixed decimal
export const pct = (n, dec = 1) =>
    typeof n === 'number' ? (n >= 0 ? '+' : '') + n.toFixed(dec) + '%' : '—'

// Parse MIT issue ID → readable date. "_RV_Alpha-MIT-Apr0626_v3" → "Apr 06 2026"
export const issueDate = (id) => {
    const m = (id || '').match(/([A-Za-z]{3})(\d{2})(\d{2})/)
    return m ? `${m[1]} ${m[2]} 20${m[3]}` : (id || '').replace(/^_/, '').replace(/_v\d+$/, '')
}

// Parse prior issue ID → short label. "20260326_..." → "Mar 26"
export const priorDate = (id) => {
    const m = (id || '').match(/^(\d{4})(\d{2})(\d{2})/)
    if(!m) return (id || '').replace(/_v\d+$/, '')
    const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${mon[+ m[2] - 1]} ${m[3]}`
}
