/**
 * Intent-specific report templates for Ask MIT report mode
 */
export const REPORT_TEMPLATES = {
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
