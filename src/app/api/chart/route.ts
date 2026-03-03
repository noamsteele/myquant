import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker");

    if (!ticker) {
        return NextResponse.json({ error: "No ticker provided" }, { status: 400 });
    }

    try {
        let query = ticker.toUpperCase();
        const cryptoTickers = ['BTC', 'ETH', 'SOL', 'ADA', 'DOGE', 'XRP', 'DOT', 'LTC', 'LINK', 'BNB'];
        if (cryptoTickers.includes(query)) {
            query = `${query}-USD`;
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const result = await yahooFinance.chart(query, {
            period1: startDate,
            period2: endDate,
            interval: "1d",
        }) as any;

        const quotes = result?.quotes ?? [];

        const data = quotes
            .filter((q: any) => q.close !== null && q.close !== undefined)
            .map((q: any) => ({
                date: new Date(q.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                price: parseFloat(q.close.toFixed(2)),
            }));

        return NextResponse.json({ data });
    } catch (e) {
        console.warn(`[chart/route.ts] Failed to fetch chart data for ${ticker}:`, e);
        return NextResponse.json({ data: [] });
    }
}
