"use client";

import { useState, useEffect } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import { Search, Plus, Trash2, Activity } from "lucide-react";

export default function Watchlist() {
    const { watchlist, addToWatchlist, removeFromWatchlist, currencySymbol } = usePortfolio();

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<{ id: string, name: string, symbol: string, thumb: string }[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Mock live prices since we don't have access to the internals of PortfolioContext fetching for Watchlist items here natively unless it's exposed, but we can do a local fetch for display.
    const [watchlistPrices, setWatchlistPrices] = useState<Record<string, { price: number, change: number }>>({});

    // CoinGecko Search API Debounce
    useEffect(() => {
        const fetchAssets = async () => {
            if (searchQuery.trim().length < 2) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${searchQuery}`);
                const data = await res.json();
                if (data && data.coins) {
                    setSearchResults(data.coins.slice(0, 4));
                }
            } catch (err) {
                console.error("CoinGecko search failed:", err);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(fetchAssets, 400);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // Fetch live prices for watchlist
    useEffect(() => {
        if (!watchlist.length) return;
        const toFetch = watchlist.join(",");

        // Let's fetch the real prices from the internal API
        fetch(`/api/prices?tickers=${toFetch},CAD=X`)
            .then(res => res.json())
            .then(data => {
                setWatchlistPrices(data);
            })
            .catch(err => console.error("Failed to fetch watchlist prices", err));
    }, [watchlist]);

    const handleAdd = (symbol: string) => {
        addToWatchlist(symbol.toUpperCase());
        setSearchQuery("");
        setSearchResults([]);
    };

    const fxRate = watchlistPrices["CAD=X"]?.price || 1.35;
    const isCAD = currencySymbol === "C$";

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 pt-8 px-4 font-sans space-y-8">
            <header className="mb-2">
                <h1 className="text-3xl font-bold tracking-tight">Watchlist</h1>
                <p className="text-tab-inactive text-sm font-medium">Track assets before you buy</p>
            </header>

            {/* Search Input */}
            <div className="glass rounded-xl p-4 relative z-20 overflow-visible">
                <div className="relative flex items-center">
                    <Search className="absolute left-3 text-tab-inactive" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search ticker to add..."
                        className="w-full bg-transparent pl-10 py-2 font-bold placeholder-foreground/20 focus:outline-none uppercase"
                    />
                    {isSearching && (
                        <div className="absolute right-3 w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    )}
                </div>

                {/* Autocomplete Dropdown */}
                {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-[110%] bg-[#f2f2f7] dark:bg-[#1C1C1E] border border-glass-border rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] max-h-60 overflow-y-auto overflow-hidden text-foreground">
                        {searchResults.map((coin) => (
                            <div
                                key={coin.id}
                                onClick={() => handleAdd(coin.symbol)}
                                className="flex items-center justify-between p-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer border-b border-glass-border last:border-0"
                            >
                                <div className="flex items-center gap-3">
                                    {coin.thumb && <img src={coin.thumb} alt={coin.symbol} className="w-6 h-6 rounded-full" />}
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm uppercase">{coin.symbol}</span>
                                        <span className="text-xs text-tab-inactive max-w-[150px] truncate">{coin.name}</span>
                                    </div>
                                </div>
                                <Plus size={18} className="text-accent" />
                            </div>
                        ))}
                        {/* Always add an option for users manually typing stock symbols that Coingecko might not find */}
                        <div
                            onClick={() => handleAdd(searchQuery)}
                            className="flex items-center justify-between p-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer border-t border-glass-border/50 text-accent font-medium text-sm"
                        >
                            <span>Add "{searchQuery.toUpperCase()}" as stock ticker</span>
                            <Plus size={16} />
                        </div>
                    </div>
                )}
            </div>

            {/* Watchlist Items */}
            <div className="space-y-4">
                {watchlist.length === 0 ? (
                    <div className="glass rounded-[1.5rem] p-10 flex flex-col items-center justify-center text-center border border-glass-border">
                        <Activity size={32} className="text-tab-inactive mb-4" />
                        <h4 className="text-lg font-bold mb-2">Empty Watchlist</h4>
                        <p className="text-tab-inactive text-sm font-medium leading-relaxed">
                            Search for a stock or crypto ticker above to start tracking real-time prices.
                        </p>
                    </div>
                ) : (
                    watchlist.map((ticker) => {
                        const data = watchlistPrices[ticker] || { price: 0, change: 0 };
                        const normalizedPrice = isCAD ? data.price * fxRate : data.price;
                        const isPositive = data.change >= 0;

                        return (
                            <div key={ticker} className="glass rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform duration-200">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center font-bold text-lg text-accent border border-glass-border">
                                        {ticker[0]}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-lg leading-tight uppercase">{ticker}</h4>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="font-semibold text-[1.1rem] leading-tight">
                                            {currencySymbol}{normalizedPrice ? normalizedPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "..."}
                                        </p>
                                        <div className={`flex items-center justify-end text-sm font-medium ${isPositive ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                                            {isPositive ? "+" : ""}{data.change ? data.change.toFixed(2) : "0.00"}%
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeFromWatchlist(ticker)}
                                        className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 active:scale-90 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
}
