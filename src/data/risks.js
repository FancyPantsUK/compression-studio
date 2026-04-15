/**
 * Static risk flags — playbook section 06 contract
 */
export const RED_FLAGS = [
    { ticker: 'HYG:IEF',           desc: 'Credit spreads widening — risk-off signal',        trigger: 'Crosses below 50-day MA or turns negative 1m' },
    { ticker: 'UUP:SPY',            desc: 'Dollar surging vs equities — global tightening',   trigger: 'DXY sustained surge + EM selling' },
    { ticker: 'ISM Breadth',         desc: 'Manufacturing breadth deteriorating',              trigger: 'Drops below 45% or prints 2nd consecutive miss' },
    { ticker: 'EEM:SPY',             desc: 'EM underperforming US — global risk appetite off', trigger: '1m negative + 3m negative = avoid EM' },
    { ticker: 'Unemployment Breadth',desc: 'Jobless claims breadth turning',                  trigger: 'Initial claims 4-week MA rising >10%' },
    { ticker: 'Oil USO',             desc: 'Oil spike disrupting margins and sentiment',       trigger: 'USO +20% in 3m or WTI >$95' },
]

export const GREEN_FLAGS = [
    { ticker: 'SOXX:QQQ',     desc: 'Semis outperforming tech — capex cycle intact',     target: 'SOXX:QQQ 1m positive' },
    { ticker: 'ISM Breadth',  desc: 'Manufacturing breadth expanding — mid-cycle',       target: '>55% positive = expansion signal' },
    { ticker: '1M Breadth',   desc: 'Industry breadth confirming — broad participation', target: '>60% of sectors positive 1m' },
    { ticker: 'OIH/HAL/SLB', desc: 'Energy services acting well — cycle support',       target: 'All three > +5% 1m' },
    { ticker: 'EEM:IEF',      desc: 'EM outperforming bonds — global risk-on',           target: '1m positive + trend improving' },
    { ticker: 'HYG:IEF',      desc: 'Credit spreads compressing — liquidity unlocked',   target: 'Positive 1m and 3m = full size' },
]

/**
 * Static structural risk scenarios — playbook section 07 contract
 */
export const STRUCTURAL_RISKS = [
    { n: 1, title: 'Oil Price Spike',          severity: 'red',   desc: 'Sustained move above $95 WTI disrupts margins, compresses consumer, and forces Fed hawkishness. Energy costs bleed into ISM and earnings.' },
    { n: 2, title: 'Tariff Escalation',        severity: 'red',   desc: 'Renewed trade barriers compress EM earnings and global supply chains. Dollar strength feedback loop: tighter global liquidity.' },
    { n: 3, title: 'Fed Policy Reversal',      severity: 'red',   desc: 'Inflation re-acceleration forces Fed to signal rate hikes. Real yield spike triggers multiple compression across growth assets.' },
    { n: 4, title: 'Credit Dislocation',       severity: 'red',   desc: 'HYG:IEF spread breakout or IG widening signals credit cycle roll. Shadow banking or levered vehicle stress amplifies.' },
    { n: 5, title: 'Geopolitical Escalation',  severity: 'red',   desc: 'Middle East or Taiwan shock triggers oil spike + safe haven flows. Risk assets reset lower; breadth collapses within sessions.' },
    { n: 6, title: 'Breadth Fails to Expand',  severity: 'amber', desc: 'Market rally narrows to 5-10 mega caps. IWM:SPY turns negative; RSP:SPY lags. Signal: rotation thesis is not confirmed.' },
]
