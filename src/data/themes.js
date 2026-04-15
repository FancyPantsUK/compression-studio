/**
 * Theme → ticker mapping
 * Keyed on lowercase substrings of MIT key_drivers[0].
 * Graceful fallback: no match → label = driver string, no chips.
 */
export const THEME_TICKERS = {
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

export const WATCHLISTS = {
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
