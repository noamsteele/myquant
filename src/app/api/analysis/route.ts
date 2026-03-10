import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

const KNOWN_CRYPTO = new Set([
    'BTC', 'ETH', 'SOL', 'ADA', 'DOGE', 'XRP', 'DOT', 'LTC', 'LINK', 'BNB', 'AVAX',
    'MATIC', 'SHIB', 'UNI', 'ATOM', 'NEAR', 'FTM', 'ALGO', 'ICP', 'XLM', 'VET',
    'SAND', 'MANA', 'AXS', 'FIL', 'HBAR', 'ETC', 'THETA', 'AAVE', 'MKR', 'TON',
    'OP', 'ARB', 'INJ', 'SUI', 'APT', 'PEPE', 'TRX', 'BCH', 'XMR', 'ZEC',
]);

const COINGECKO_IDS: Record<string, string> = {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', ADA: 'cardano',
    DOGE: 'dogecoin', XRP: 'ripple', DOT: 'polkadot', LTC: 'litecoin',
    LINK: 'chainlink', BNB: 'binancecoin', AVAX: 'avalanche-2',
    MATIC: 'matic-network', SHIB: 'shiba-inu', UNI: 'uniswap',
    ATOM: 'cosmos', NEAR: 'near', FTM: 'fantom', ALGO: 'algorand',
    ICP: 'internet-computer', XLM: 'stellar', VET: 'vechain',
    SAND: 'the-sandbox', MANA: 'decentraland', AXS: 'axie-infinity',
    FIL: 'filecoin', HBAR: 'hedera-hashgraph', ETC: 'ethereum-classic',
    THETA: 'theta-token', AAVE: 'aave', MKR: 'maker', TON: 'the-open-network',
    OP: 'optimism', ARB: 'arbitrum', INJ: 'injective-protocol',
    SUI: 'sui', APT: 'aptos', PEPE: 'pepe', TRX: 'tron',
    BCH: 'bitcoin-cash', XMR: 'monero', ZEC: 'zcash',
};

// Next BTC halvings (approximate block schedule — update as needed)
const BTC_HALVINGS = [
    { date: "2028-04-20", label: "5th Halving (est.)" },
];

function nextHalvingInfo() {
    const now = Date.now();
    for (const h of BTC_HALVINGS) {
        if (new Date(h.date).getTime() > now) return h;
    }
    return null;
}

// Days until a given ISO date string
function daysUntil(dateStr: string): number {
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

async function fetchCryptoData(ticker: string) {
    const id = COINGECKO_IDS[ticker];
    if (!id) return null;

    const url = `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const d = await res.json();

    const md = d.market_data || {};
    const halvingInfo = ticker === "BTC" ? nextHalvingInfo() : null;

    return {
        assetType: "crypto",
        name: d.name,
        ticker,
        price: md.current_price?.usd ?? 0,
        change24h: md.price_change_percentage_24h ?? 0,
        change7d: md.price_change_percentage_7d ?? 0,
        change30d: md.price_change_percentage_30d ?? 0,
        marketCap: md.market_cap?.usd ?? 0,
        marketCapRank: d.market_cap_rank ?? null,
        volume24h: md.total_volume?.usd ?? 0,
        circulatingSupply: md.circulating_supply ?? 0,
        totalSupply: md.total_supply ?? null,
        maxSupply: md.max_supply ?? null,
        ath: md.ath?.usd ?? 0,
        athDate: md.ath_date?.usd ?? null,
        atl: md.atl?.usd ?? 0,
        high24h: md.high_24h?.usd ?? 0,
        low24h: md.low_24h?.usd ?? 0,
        // BTC-specific upcoming date
        upcomingEvent: halvingInfo
            ? {
                type: "halving",
                label: halvingInfo.label,
                date: halvingInfo.date,
                daysUntil: daysUntil(halvingInfo.date),
            }
            : null,
        description: d.description?.en
            ? d.description.en.replace(/<[^>]+>/g, "").split(". ").slice(0, 3).join(". ") + "."
            : null,
    };
}

async function fetchStockData(ticker: string) {
    const [quote, summary] = await Promise.allSettled([
        yahooFinance.quote(ticker) as Promise<any>,
        yahooFinance.quoteSummary(ticker, {
            modules: ["summaryDetail", "defaultKeyStatistics", "calendarEvents", "assetProfile"],
        }) as Promise<any>,
    ]);

    const q = quote.status === "fulfilled" ? quote.value : {};
    const s = summary.status === "fulfilled" ? summary.value : {};

    const detail = s.summaryDetail || {};
    const stats = s.defaultKeyStatistics || {};
    const calendar = s.calendarEvents || {};
    const profile = s.assetProfile || {};

    // Earnings date
    let earningsDate: string | null = null;
    let earningsDaysUntil: number | null = null;
    const earningsDates: any[] = calendar.earnings?.earningsDate ?? [];
    if (earningsDates.length > 0) {
        const next = earningsDates.find((d: any) => {
            const t = typeof d === "string" ? new Date(d) : d instanceof Date ? d : null;
            return t && t.getTime() > Date.now();
        });
        if (next) {
            const d = typeof next === "string" ? next : next instanceof Date ? next.toISOString().split("T")[0] : null;
            if (d) {
                earningsDate = d;
                earningsDaysUntil = daysUntil(d);
            }
        }
    }

    // Ex-dividend date
    let exDivDate: string | null = null;
    if (detail.exDividendDate) {
        const d = detail.exDividendDate;
        const dateStr = d instanceof Date ? d.toISOString().split("T")[0] : typeof d === "string" ? d : null;
        if (dateStr && new Date(dateStr).getTime() > Date.now()) exDivDate = dateStr;
    }

    return {
        assetType: "stock",
        name: q.longName || q.shortName || ticker,
        ticker,
        exchange: q.fullExchangeName || q.exchange || null,
        sector: profile.sector || null,
        industry: profile.industry || null,
        description: profile.longBusinessSummary
            ? profile.longBusinessSummary.split(". ").slice(0, 3).join(". ") + "."
            : null,
        price: q.regularMarketPrice ?? 0,
        change1d: q.regularMarketChangePercent ?? 0,
        volume: q.regularMarketVolume ?? 0,
        avgVolume: q.averageDailyVolume3Month ?? q.averageDailyVolume10Day ?? 0,
        marketCap: q.marketCap ?? 0,
        high52w: q.fiftyTwoWeekHigh ?? 0,
        low52w: q.fiftyTwoWeekLow ?? 0,
        high24h: q.regularMarketDayHigh ?? 0,
        low24h: q.regularMarketDayLow ?? 0,
        open: q.regularMarketOpen ?? 0,
        previousClose: q.regularMarketPreviousClose ?? 0,
        // Ratios
        peRatio: q.trailingPE ?? detail.trailingPE ?? null,
        forwardPE: q.forwardPE ?? detail.forwardPE ?? null,
        eps: q.epsTrailingTwelveMonths ?? null,
        forwardEps: q.epsForward ?? null,
        pbRatio: stats.priceToBook ?? null,
        psRatio: stats.priceToSalesTrailingTwelveMonths ?? null,
        dividendYield: detail.dividendYield != null ? detail.dividendYield * 100 : null,
        dividendRate: detail.dividendRate ?? null,
        payoutRatio: detail.payoutRatio != null ? detail.payoutRatio * 100 : null,
        beta: detail.beta ?? stats.beta ?? null,
        shortRatio: stats.shortRatio ?? null,
        roe: stats.returnOnEquity != null ? stats.returnOnEquity * 100 : null,
        debtToEquity: stats.debtToEquity ?? null,
        revenueGrowth: stats.revenueGrowth != null ? stats.revenueGrowth * 100 : null,
        earningsGrowth: stats.earningsGrowth != null ? stats.earningsGrowth * 100 : null,
        // Upcoming dates
        earningsDate: earningsDate ? { date: earningsDate, daysUntil: earningsDaysUntil } : null,
        exDividendDate: exDivDate ? { date: exDivDate, daysUntil: daysUntil(exDivDate) } : null,
        // Analyst
        targetMeanPrice: q.targetMeanPrice ?? null,
        analystRating: q.averageAnalystRating ?? null,
        numberOfAnalysts: q.numberOfAnalystOpinions ?? null,
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");
    if (!ticker) return NextResponse.json({ error: "No ticker" }, { status: 400 });

    const upper = ticker.toUpperCase().replace(/-USD$/i, "");

    try {
        if (KNOWN_CRYPTO.has(upper) || COINGECKO_IDS[upper]) {
            const data = await fetchCryptoData(upper);
            if (data) return NextResponse.json(data);
        }
        const data = await fetchStockData(ticker.toUpperCase());
        return NextResponse.json(data);
    } catch (err: any) {
        console.error("[analysis/route.ts]", err?.message || err);
        return NextResponse.json({ error: "Failed to fetch analysis" }, { status: 500 });
    }
}
