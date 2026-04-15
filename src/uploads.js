import { refreshBrief } from './state/store.js'

/**
 * Upload panel — three lane file inputs (industry, liquidity, master)
 * Each uploads raw HTML to the Railway backend for server-side parsing.
 */
export const initUploads = (POINTS) => {
    const uploadToggle = document.getElementById('uploadToggle')
    const uploadPanel  = document.getElementById('uploadPanel')

    uploadToggle.addEventListener('click', () => { uploadPanel.classList.toggle('open') })

    // lane = 'industry' | 'liquidity' | 'master'
    const uploadFile = (file, statusEl, lane) => {
        statusEl.textContent = '…'
        const fd = new FormData()
        fd.append('file', file)
        fetch(`/api/rotation/${lane}/upload`, { method: 'POST', body: fd })
            .then(res => {
                if(!res.ok) return res.json().then(body => {
                    const det = body?.detail
                    const msg = typeof det === 'object' ? (det.detected || 'Unknown') : (det || res.status)
                    statusEl.textContent = `⚠ ${String(msg).slice(0, 32)}`
                    throw new Error('unrouted')
                })
                return res.json()
            })
            .then(() => {
                statusEl.textContent = '✓'
                window.setTimeout(() => refreshBrief(POINTS), 600)
            })
            .catch(err => { if(err.message !== 'unrouted') statusEl.textContent = '✗' })
    }

    document.getElementById('uploadIndustry').addEventListener('change', (e) => {
        if(e.target.files[0])
            uploadFile(e.target.files[0], document.getElementById('statusIndustry'), 'industry')
    })

    document.getElementById('uploadLiquidity').addEventListener('change', (e) => {
        if(e.target.files[0])
            uploadFile(e.target.files[0], document.getElementById('statusLiquidity'), 'liquidity')
    })

    document.getElementById('uploadMaster').addEventListener('change', (e) => {
        if(e.target.files[0])
            uploadFile(e.target.files[0], document.getElementById('statusMaster'), 'master')
    })
}
