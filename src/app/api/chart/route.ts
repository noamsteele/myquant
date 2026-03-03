import { NextResponse } from "next/server";

// List of known YF crypto pairs — tries {TICKER}-USD via yahoo first, falls back to CoinGecko
const KNOWN_CRYPTO = new Set([
    'BTC', 'ETH', 'SOL', 'ADA', 'DOGE', 'XRP', 'DOT', 'LTC', 'LINK', 'BNB', 'AVAX',
    'MATIC', 'SHIB', 'UNI', 'ATOM', 'NEAR', 'FTM', 'ALGO', 'ICP', 'XLM', 'VET',
    'SAND', 'MANA', 'AXS', 'CRO', 'FIL', 'HBAR', 'ETC', 'THETA', 'EOS', 'AAVE',
    'MKR', 'COMP', 'YFI', 'SNX', 'SUSHI', 'ZEC', 'DASH', 'XMR', 'BCH', 'TRX',
    'TON', 'OP', 'ARB', 'INJ', 'SUI', 'WLD', 'APT', 'SEI', 'PEPE', 'FLOKI',
]);

// CoinGecko id lookup for common tickers
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

async function fetchCoinGeckoChart(ticker: string): Promise<{ date: string; price: number }[]> {
    const id = COINGECKO_IDS[ticker.toUpperCase()];
    if (!id) return [];

    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=30&interval=daily`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data.prices)) return [];

    return data.prices.map(([ts, price]: [number, number]) => ({
        date: new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        price: parseFloat(price.toFixed(2)),
    }));
}

async function fetchYahooChart(symbol: string): Promise<{ date: string; price: number }[]> {
    // Use Yahoo Finance v8 chart API directly (no SDK required)
    const end = Math.floor(Date.now() / 1000);
    const start = end - 30 * 24 * 3600;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${start}&period2=${end}`;

    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 3600 },
    });
    if (!res.ok) return [];

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[] = result.timestamp ?? [];
    const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];

    return timestamps.map((ts, i) => ({
        date: new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        price: parseFloat((closes[i] ?? 0).toFixed(2)),
    })).filter(d => d.price > 0);
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");
    if (!ticker) return NextResponse.json({ error: "No ticker" }, { status: 400 });

    const upper = ticker.toUpperCase().replace(/-USD$/i, ''); // normalize e.g. ETH-USD → ETH

    // For crypto: try CoinGecko first (free, reliable), fall back to Yahoo
    if (KNOWN_CRYPTO.has(upper) || COINGECKO_IDS[upper]) {
        try {
            const data = await fetchCoinGeckoChart(upper);
            if (data.length > 0) return NextResponse.json({ data });
        } catch (_) { }
    }

    // Yahoo Finance direct API — works for stocks AND many crypto pairs
    const yahooAttempts = [ticker.toUpperCase(), `${upper}-USD`, upper];
    for (const sym of yahooAttempts) {
        try {
            const data = await fetchYahooChart(sym);
            if (data.length > 0) return NextResponse.json({ data });
        } catch (_) { }
    }

    return NextResponse.json({ data: [] });
}
