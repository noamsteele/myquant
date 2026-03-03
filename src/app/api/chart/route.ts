import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

async function fetchChartData(query: string) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const result = await yahooFinance.chart(query, {
        period1: startDate,
        period2: endDate,
        interval: "1d",
    }) as any;

    const quotes = result?.quotes ?? [];
    return quotes
        .filter((q: any) => q.close !== null && q.close !== undefined)
        .map((q: any) => ({
            date: new Date(q.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            price: parseFloat(q.close.toFixed(2)),
        }));
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");

    if (!ticker) {
        return NextResponse.json({ error: "No ticker provided" }, { status: 400 });
    }

    const query = ticker.toUpperCase();

    // Strategy: try the raw ticker first, then try {TICKER}-USD (catches all cryptos),
    // then try {TICKER}-USD (CoinGecko-style). This covers stocks, ETFs, and any crypto.
    const attempts = [
        query,                      // AAPL, ETH-USD entered verbatim
        `${query}-USD`,             // BTC → BTC-USD
        `${query}USD`,              // some exchanges use this format
        `${query}-USDT`,            // USDT markets
    ];

    for (const attempt of attempts) {
        try {
            const data = await fetchChartData(attempt);
            if (data.length > 0) {
                return NextResponse.json({ data });
            }
        } catch (_) {
            // try next variant
        }
    }

    // Nothing worked
    console.warn(`[chart/route.ts] Could not fetch chart for ${query}`);
    return NextResponse.json({ data: [] });
}
