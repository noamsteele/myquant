import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const type = searchParams.get("type") ?? "stock"; // "stock" | "crypto"

    if (!q || q.trim().length < 1) {
        return NextResponse.json({ results: [] });
    }

    if (type === "crypto") {
        // CoinGecko search
        try {
            const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`, {
                next: { revalidate: 60 },
            });
            const data = await res.json();
            const results = (data.coins ?? []).slice(0, 7).map((c: any) => ({
                symbol: c.symbol.toUpperCase(),
                name: c.name,
                thumb: c.thumb,
                type: "crypto",
            }));
            return NextResponse.json({ results });
        } catch (e) {
            console.error("CoinGecko search error:", e);
            return NextResponse.json({ results: [] });
        }
    }

    // Stock search via Yahoo Finance
    try {
        const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=7&newsCount=0&listsCount=0`;
        const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
            next: { revalidate: 60 },
        });
        const data = await res.json();
        const quotes = (data.quotes ?? [])
            .filter((q: any) => q.quoteType === "EQUITY" || q.quoteType === "ETF" || q.quoteType === "INDEX")
            .slice(0, 7)
            .map((q: any) => ({
                symbol: q.symbol,
                name: q.longname || q.shortname || q.symbol,
                exchange: q.exchange,
                type: "stock",
            }));
        return NextResponse.json({ results: quotes });
    } catch (e) {
        console.error("Yahoo search error:", e);
        return NextResponse.json({ results: [] });
    }
}
