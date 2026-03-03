"use client";

import { useState, useEffect } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import { Search, Plus, Trash2, Activity, BarChart2, Bitcoin } from "lucide-react";

type SearchResult = {
    symbol: string;
    name: string;
    thumb?: string;
    exchange?: string;
    assetType: "stock" | "etf" | "crypto";
};

// localStorage key for persisting asset type metadata
const META_KEY = "myquant_watchlist_meta";

function loadMeta(): Record<string, "stock" | "etf" | "crypto"> {
    try {
        const saved = localStorage.getItem(META_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
}

function saveMeta(meta: Record<string, "stock" | "etf" | "crypto">) {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
}

const TAG_STYLE: Record<string, string> = {
    stock: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    etf:   "bg-purple-500/15 text-purple-400 border-purple-500/25",
    crypto: "bg-orange-500/15 text-orange-400 border-orange-500/25",
};

export default function Watchlist() {
    const { watchlist, addToWatchlist, removeFromWatchlist, currencySymbol } = usePortfolio();

    const [searchQuery, setSearchQuery] = useState("");
    const [searchMode, setSearchMode] = useState<"stock" | "crypto">("stock");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [watchlistPrices, setWatchlistPrices] = useState<Record<string, { price: number; change: number }>>({});
    const [meta, setMeta] = useState<Record<string, "stock" | "etf" | "crypto">>({});

    // Load persisted meta on mount
    useEffect(() => {
        setMeta(loadMeta());
    }, []);

    // Search with debounce — uses unified /api/search route
    useEffect(() => {
        const run = async () => {
            const q = searchQuery.trim();
            if (q.length < 1) { setSearchResults([]); return; }
            setIsSearching(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${searchMode}`);
                const data = await res.json();
                const results: SearchResult[] = (data.results ?? []).map((r: any) => ({
                    symbol: r.symbol.toUpperCase(),
                    name: r.name,
                    thumb: r.thumb,
                    exchange: r.exchange,
                    assetType: r.type === "crypto" ? "crypto" : (r.exchange?.includes("ETF") ? "etf" : "stock"),
                }));
                setSearchResults(results.slice(0, 6));
            } catch { setSearchResults([]); }
            finally { setIsSearching(false); }
        };
        const id = setTimeout(run, 350);
        return () => clearTimeout(id);
    }, [searchQuery, searchMode]);

    // Reset search results when toggling mode
    useEffect(() => {
        setSearchResults([]);
        setSearchQuery("");
    }, [searchMode]);

    // Fetch live prices for watchlist items
    useEffect(() => {
        if (!watchlist.length) return;
        fetch(`/api/prices?tickers=${watchlist.join(",")},CAD=X`)
            .then(r => r.json())
            .then(data => setWatchlistPrices(data))
            .catch(console.error);
    }, [watchlist]);

    const handleAdd = (result: SearchResult) => {
        addToWatchlist(result.symbol);
        const next = { ...meta, [result.symbol]: result.assetType };
        setMeta(next);
        saveMeta(next);
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleRemove = (ticker: string) => {
        removeFromWatchlist(ticker);
        const next = { ...meta };
        delete next[ticker];
        setMeta(next);
        saveMeta(next);
    };

    const fxRate = watchlistPrices["CAD=X"]?.price || 1.36;
    const isCAD = currencySymbol === "C$";

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 pt-8 px-4 font-sans space-y-5">
            <header className="mb-1">
                <h1 className="text-3xl font-bold tracking-tight">Watchlist</h1>
                <p className="text-tab-inactive text-sm font-medium">Track assets before you buy</p>
            </header>

            {/* Stock / Crypto Search Mode Toggle */}
            <div className="glass p-1 rounded-xl flex border border-glass-border">
                <button
                    onClick={() => setSearchMode("stock")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${searchMode === "stock" ? "bg-foreground/10 text-foreground shadow" : "text-tab-inactive"}`}
                >
                    <BarChart2 size={13} />
                    Stock / ETF
                </button>
                <button
                    onClick={() => setSearchMode("crypto")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${searchMode === "crypto" ? "bg-foreground/10 text-foreground shadow" : "text-tab-inactive"}`}
                >
                    <Bitcoin size={13} />
                    Crypto
                </button>
            </div>

            {/* Search Input */}
            <div className="glass rounded-xl p-4 relative z-20 overflow-visible border border-glass-border">
                <div className="relative flex items-center">
                    <Search className="absolute left-0 text-tab-inactive" size={17} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onBlur={() => setTimeout(() => setSearchResults([]), 200)}
                        placeholder={searchMode === "stock" ? "Search stocks & ETFs..." : "Search crypto..."}
                        className="w-full bg-transparent pl-7 py-1.5 font-semibold placeholder-foreground/25 focus:outline-none uppercase text-base"
                    />
                    {isSearching && (
                        <div className="absolute right-0 w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    )}
                </div>

                {/* Autocomplete Dropdown */}
                {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-[110%] bg-[#f0f2f7] dark:bg-[#0d1a30] border border-glass-border rounded-lg shadow-2xl max-h-72 overflow-y-auto z-50">
                        {searchResults.map((result) => (
                            <div
                                key={result.symbol}
                                onClick={() => handleAdd(result)}
                                className="flex items-center justify-between px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer border-b border-glass-border last:border-0"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {result.thumb ? (
                                        <img src={result.thumb} alt={result.symbol} className="w-7 h-7 rounded-full flex-shrink-0" />
                                    ) : (
                                        <div className="w-7 h-7 rounded-md bg-accent/15 flex items-center justify-center text-accent font-bold text-xs flex-shrink-0">
                                            {result.symbol[0]}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">{result.symbol}</span>
                                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${TAG_STYLE[result.assetType]}`}>
                                                {result.assetType.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-tab-inactive truncate">{result.name}{result.exchange ? ` · ${result.exchange}` : ""}</p>
                                    </div>
                                </div>
                                <Plus size={17} className="text-accent flex-shrink-0 ml-2" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Watchlist Items */}
            <div className="space-y-3">
                {watchlist.length === 0 ? (
                    <div className="glass rounded-xl p-10 flex flex-col items-center justify-center text-center border border-glass-border">
                        <Activity size={28} className="text-tab-inactive mb-4" />
                        <h4 className="text-base font-bold mb-2">Empty Watchlist</h4>
                        <p className="text-tab-inactive text-sm font-medium leading-relaxed">
                            Search for a stock, ETF, or crypto above to start tracking prices.
                        </p>
                    </div>
                ) : (
                    watchlist.filter(t => t !== "CAD=X").map((ticker) => {
                        const data = watchlistPrices[ticker] || { price: 0, change: 0 };
                        const normalizedPrice = isCAD ? data.price * fxRate : data.price;
                        const isPositive = data.change >= 0;
                        const assetLabel = meta[ticker];

                        return (
                            <div key={ticker} className="glass rounded-xl p-4 flex items-center justify-between border border-glass-border active:scale-[0.98] transition-transform duration-150">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-md bg-accent/15 flex items-center justify-center font-bold text-base text-accent border border-accent/20">
                                        {ticker[0]}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-base leading-tight uppercase">{ticker}</h4>
                                            {assetLabel && (
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${TAG_STYLE[assetLabel]}`}>
                                                    {assetLabel.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-tab-inactive font-medium">{data.price ? "Live" : "Pending..."}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="font-semibold text-base leading-tight">
                                            {normalizedPrice ? `${currencySymbol}${normalizedPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                                        </p>
                                        <div className={`text-xs font-medium ${isPositive ? "text-[#00e5a0]" : "text-[#ff3d57]"}`}>
                                            {isPositive ? "+" : ""}{data.change ? data.change.toFixed(2) : "0.00"}%
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(ticker)}
                                        className="w-7 h-7 rounded-md bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/25 active:scale-90 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
