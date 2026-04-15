/**
 * Static signal pairs — playbook section 05 contract
 * desc = sub-label in Signal Pair column
 * invert = true means negative return = bullish (USD pairs)
 */
export const SIGNAL_PAIRS = [
    { key: 'SOXX:QQQ',  desc: 'Semis vs tech — risk appetite' },
    { key: 'EEM:SPY',   desc: 'EM vs US — global breadth' },
    { key: 'EEM:IEF',   desc: 'EM vs bonds — risk-on gauge' },
    { key: 'HYG:IEF',   desc: 'Credit vs duration — spread signal' },
    { key: 'IWM:SPY',   desc: 'Small cap vs large — cycle breadth' },
    { key: 'UUP:SPY',   desc: 'Dollar vs equities — invert for risk-on', invert: true },
    { key: 'RSP:SPY',   desc: 'Equal weight vs cap-weight — breadth' },
    { key: 'ITB:IEF',   desc: 'Homebuilders vs bonds — rate sensitivity' },
]
