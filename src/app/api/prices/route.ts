import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const tickersParam = searchParams.get("tickers");

    if (!tickersParam) {
        return NextResponse.json({ error: "No tickers provided" }, { status: 400 });
    }

    const tickers = tickersParam.split(",");
    const results: Record<string, { price: number; change: number; name: string }> = {};

    for (const ticker of tickers) {
        if (!ticker) continue;

        try {
            let query = ticker.toUpperCase();
            // Heuristic for popular crypto pairs
            const cryptoTickers = ['BTC', 'ETH', 'SOL', 'ADA', 'DOGE', 'XRP', 'DOT', 'LTC', 'LINK', 'BNB'];
            if (cryptoTickers.includes(query)) {
                query = `${query}-USD`;
            }

            // Supress internal warnings and fetch quote
            // yahooFinance.suppressNotices(['yahooSurvey']);
            const quote = await yahooFinance.quote(query) as any;

            results[ticker] = {
                price: quote.regularMarketPrice || 0,
                change: quote.regularMarketChangePercent || 0,
                name: quote.longName || quote.shortName || ticker,
            };
        } catch (e) {
            console.warn(`[prices/route.ts] Failed to fetch data for ${ticker}:`, e);
        }
    }

    return NextResponse.json(results);
}
