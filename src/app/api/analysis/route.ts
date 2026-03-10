import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

/* ─── Crypto config ─────────────────────────────────────────────── */
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

const BTC_HALVINGS = [{ date: "2028-04-20", label: "5th Halving (est.)" }];

function nextHalvingInfo() {
    for (const h of BTC_HALVINGS) {
        if (new Date(h.date).getTime() > Date.now()) return h;
    }
    return null;
}

function daysUntil(dateStr: string): number {
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

/* ─── Safe yahoo-finance2 wrapper ───────────────────────────────── */
// v3 throws FailedYahooValidationError on unexpected fields.
// Pass `validateResult: false` to skip schema checks silently.
const YF_OPTS = { validateResult: false } as any;

async function safeQuote(ticker: string): Promise<any> {
    try {
        return await (yahooFinance.quote as any)(ticker, {}, YF_OPTS) ?? {};
    } catch (e: any) {
        // If validation error, the partial data is on e.result
        return e?.result ?? {};
    }
}

async function safeModule(ticker: string, mod: string): Promise<any> {
    try {
        const res = await (yahooFinance.quoteSummary as any)(
            ticker,
            { modules: [mod] },
            YF_OPTS
        );
        return res?.[mod] ?? {};
    } catch (e: any) {
        return e?.result?.[mod] ?? {};
    }
}

/* ─── Crypto ─────────────────────────────────────────────────────── */
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
        priceCAD: md.current_price?.cad ?? 0,
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
        upcomingEvent: halvingInfo
            ? { type: "halving", label: halvingInfo.label, date: halvingInfo.date, daysUntil: daysUntil(halvingInfo.date) }
            : null,
        description: d.description?.en
            ? d.description.en.replace(/<[^>]+>/g, "").split(". ").slice(0, 3).join(". ") + "."
            : null,
    };
}

/* ─── Stock / ETF ────────────────────────────────────────────────── */
async function fetchStockData(ticker: string) {
    // Fetch quote and each summary module independently so one failure doesn't kill everything
    const [q, detail, stats, calendar, profile] = await Promise.all([
        safeQuote(ticker),
        safeModule(ticker, "summaryDetail"),
        safeModule(ticker, "defaultKeyStatistics"),
        safeModule(ticker, "calendarEvents"),
        safeModule(ticker, "assetProfile"),
    ]);

    // Earnings date — yahoo-finance2 v3 returns Date objects
    let earningsDate: string | null = null;
    let earningsDaysUntil: number | null = null;
    const earningsDates: any[] = calendar.earnings?.earningsDate ?? [];
    for (const d of earningsDates) {
        const dt = d instanceof Date ? d : typeof d === "string" ? new Date(d) : null;
        if (dt && dt.getTime() > Date.now()) {
            earningsDate = dt.toISOString().split("T")[0];
            earningsDaysUntil = daysUntil(earningsDate);
            break;
        }
    }

    // Ex-dividend date
    let exDivDate: string | null = null;
    if (detail.exDividendDate) {
        const d = detail.exDividendDate;
        const dt = d instanceof Date ? d : typeof d === "string" ? new Date(d) : null;
        if (dt && dt.getTime() > Date.now()) {
            exDivDate = dt.toISOString().split("T")[0];
        }
    }

    // Safely extract numbers with nullish fallback
    const n = (v: any): number | null => (v != null && !isNaN(Number(v)) ? Number(v) : null);
    const pct = (v: any): number | null => (v != null && !isNaN(Number(v)) ? Number(v) * 100 : null);

    return {
        assetType: "stock",
        name: q.longName || q.shortName || ticker,
        ticker,
        exchange: q.fullExchangeName || q.exchange || null,
        sector: profile.sector || null,
        industry: profile.industry || null,
        description: profile.longBusinessSummary
            ? (profile.longBusinessSummary as string).split(". ").slice(0, 3).join(". ") + "."
            : null,
        // Price
        price: n(q.regularMarketPrice) ?? 0,
        change1d: n(q.regularMarketChangePercent) ?? 0,
        volume: n(q.regularMarketVolume) ?? 0,
        avgVolume: n(q.averageDailyVolume3Month) ?? n(q.averageDailyVolume10Day) ?? 0,
        marketCap: n(q.marketCap) ?? 0,
        high52w: n(q.fiftyTwoWeekHigh) ?? 0,
        low52w: n(q.fiftyTwoWeekLow) ?? 0,
        high24h: n(q.regularMarketDayHigh) ?? 0,
        low24h: n(q.regularMarketDayLow) ?? 0,
        open: n(q.regularMarketOpen) ?? 0,
        previousClose: n(q.regularMarketPreviousClose) ?? 0,
        // Valuation
        peRatio: n(q.trailingPE) ?? n(detail.trailingPE),
        forwardPE: n(q.forwardPE) ?? n(detail.forwardPE),
        eps: n(q.epsTrailingTwelveMonths),
        forwardEps: n(q.epsForward),
        pbRatio: n(stats.priceToBook),
        psRatio: n(stats.priceToSalesTrailingTwelveMonths),
        // Dividends
        dividendYield: detail.dividendYield != null ? (Number(detail.dividendYield) < 1 ? Number(detail.dividendYield) * 100 : Number(detail.dividendYield)) : null,
        dividendRate: n(detail.dividendRate),
        payoutRatio: detail.payoutRatio != null ? (Number(detail.payoutRatio) <= 1 ? Number(detail.payoutRatio) * 100 : Number(detail.payoutRatio)) : null,
        // Risk / efficiency
        beta: n(detail.beta) ?? n(stats.beta),
        shortRatio: n(stats.shortRatio),
        roe: stats.returnOnEquity != null ? (Math.abs(Number(stats.returnOnEquity)) <= 2 ? Number(stats.returnOnEquity) * 100 : Number(stats.returnOnEquity)) : null,
        debtToEquity: n(stats.debtToEquity),
        revenueGrowth: stats.revenueGrowth != null ? (Math.abs(Number(stats.revenueGrowth)) <= 10 ? Number(stats.revenueGrowth) * 100 : Number(stats.revenueGrowth)) : null,
        earningsGrowth: stats.earningsGrowth != null ? (Math.abs(Number(stats.earningsGrowth)) <= 10 ? Number(stats.earningsGrowth) * 100 : Number(stats.earningsGrowth)) : null,
        // Dates
        earningsDate: earningsDate ? { date: earningsDate, daysUntil: earningsDaysUntil } : null,
        exDividendDate: exDivDate ? { date: exDivDate, daysUntil: daysUntil(exDivDate) } : null,
        // Analyst
        targetMeanPrice: n(q.targetMeanPrice),
        analystRating: q.averageAnalystRating ?? null,
        numberOfAnalysts: n(q.numberOfAnalystOpinions),
    };
}

/* ─── Route handler ──────────────────────────────────────────────── */
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
        // Make sure we at least got a name / price — if not, the ticker is likely invalid
        if (!data.price && !data.name) {
            return NextResponse.json({ error: "No data returned for ticker" }, { status: 404 });
        }
        return NextResponse.json(data);
    } catch (err: any) {
        console.error("[analysis/route.ts]", err?.message || err);
        return NextResponse.json({ error: err?.message || "Failed to fetch analysis" }, { status: 500 });
    }
}
