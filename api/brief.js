/**
 * api/brief.js — Vercel serverless function
 *
 * Bridges the frontend's GET /api/brief to the Railway server's POST /brief.
 * The local dev Vite proxy sent this to localhost:8001/brief-snapshot (a caching
 * GET wrapper). The production Railway endpoint is POST /brief.
 */

const RAILWAY_URL = 'https://mit-expression-brain-production.up.railway.app/brief'

export default async function handler(req, res) {
    try {
        const upstream = await fetch(RAILWAY_URL, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    '{}',
        })

        const text = await upstream.text()

        res.setHeader('Content-Type', 'application/json')
        res.status(upstream.status).send(text)
    } catch (err) {
        res.status(503).json({ error: 'Brief service unavailable', detail: String(err.message) })
    }
}
