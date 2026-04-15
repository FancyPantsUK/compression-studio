/**
 * Static cluster definitions — playbook section 03 contract
 */
export const PLAYBOOK_CLUSTERS = [
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
