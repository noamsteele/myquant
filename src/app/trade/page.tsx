"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePortfolio } from "@/context/PortfolioContext";
import { Bitcoin, BarChart2 } from "lucide-react";

type SearchResult = {
    symbol: string;
    name: string;
    thumb?: string;
    exchange?: string;
    type: "stock" | "crypto";
};

export default function TradeInput() {
    const router = useRouter();
    const { addTrade, currency: baseCurrency } = usePortfolio();

    const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
    const [ticker, setTicker] = useState("");
    const [quantity, setQuantity] = useState("");
    const [price, setPrice] = useState("");
    const [tradeCurrency, setTradeCurrency] = useState<"USD" | "CAD">(baseCurrency || "USD");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [platform, setPlatform] = useState("Questrade");

    const [assetType, setAssetType] = useState<"stock" | "crypto">("stock");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Reset search results when toggling asset type
    useEffect(() => {
        setSearchResults([]);
        setShowDropdown(false);
    }, [assetType]);

    // Unified search with debounce
    useEffect(() => {
        const fetchAssets = async () => {
            const q = ticker.trim();
            if (q.length < 1) {
                setSearchResults([]);
                setShowDropdown(false);
                return;
            }
            // Skip re-fetch if the user just selected an item
            if (!showDropdown && searchResults.some(r => r.symbol.toUpperCase() === q.toUpperCase())) return;

            setIsSearching(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${assetType}`);
                const data = await res.json();
                setSearchResults(data.results ?? []);
                setShowDropdown((data.results ?? []).length > 0);
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setIsSearching(false);
            }
        };

        const id = setTimeout(fetchAssets, 350);
        return () => clearTimeout(id);
    }, [ticker, assetType]);

    const handleSelect = (result: SearchResult) => {
        setTicker(result.symbol.toUpperCase());
        setShowDropdown(false);
        setSearchResults([]);
    };

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!ticker || !quantity || !price) return;

        addTrade({
            type: tradeType,
            ticker: ticker.toUpperCase(),
            quantity: parseFloat(quantity),
            price: parseFloat(price),
            tradeCurrency,
            date,
            platform,
        });

        router.push("/");
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 pt-8 px-4 font-sans">
            <header className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">New Trade</h1>
                <p className="text-tab-inactive text-sm font-medium">Log a new transaction</p>
            </header>

            {/* Buy / Sell Segmented Control */}
            <div className="glass p-1 rounded-xl flex mb-4 border border-glass-border">
                <button
                    onClick={() => setTradeType("BUY")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${tradeType === "BUY" ? "bg-accent text-white shadow-md" : "text-tab-inactive"}`}
                >
                    Buy
                </button>
                <button
                    onClick={() => setTradeType("SELL")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${tradeType === "SELL" ? "bg-red-500 text-white shadow-md" : "text-tab-inactive"}`}
                >
                    Sell
                </button>
            </div>

            {/* Stock / Crypto Toggle */}
            <div className="glass p-1 rounded-xl flex mb-5 border border-glass-border">
                <button
                    onClick={() => setAssetType("stock")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${assetType === "stock" ? "bg-foreground/10 text-foreground shadow" : "text-tab-inactive"}`}
                >
                    <BarChart2 size={14} />
                    Stock / ETF
                </button>
                <button
                    onClick={() => setAssetType("crypto")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${assetType === "crypto" ? "bg-foreground/10 text-foreground shadow" : "text-tab-inactive"}`}
                >
                    <Bitcoin size={14} />
                    Crypto
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Ticker Search */}
                <div className="glass rounded-xl p-4 relative z-20 overflow-visible border border-glass-border">
                    <label className="block text-xs font-semibold text-tab-inactive uppercase tracking-wider mb-2">
                        {assetType === "stock" ? "Stock / ETF Ticker" : "Crypto Ticker"}
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={ticker}
                            onChange={(e) => {
                                setTicker(e.target.value);
                                setShowDropdown(true);
                            }}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                            placeholder={assetType === "stock" ? "e.g. AAPL, MSFT, SPY" : "e.g. BTC, ETH, SOL"}
                            className="w-full bg-transparent text-xl font-bold placeholder-foreground/20 focus:outline-none uppercase"
                        />
                        {isSearching && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                        )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showDropdown && searchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-[110%] bg-[#f0f2f7] dark:bg-[#0d1a30] border border-glass-border rounded-lg shadow-2xl max-h-64 overflow-y-auto z-50">
                            {searchResults.map((result) => (
                                <div
                                    key={result.symbol}
                                    onClick={() => handleSelect(result)}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer border-b border-glass-border last:border-0"
                                >
                                    {result.thumb ? (
                                        <img src={result.thumb} alt={result.symbol} className="w-7 h-7 rounded-full flex-shrink-0" />
                                    ) : (
                                        <div className="w-7 h-7 rounded-md bg-accent/15 flex items-center justify-center text-accent font-bold text-xs flex-shrink-0">
                                            {result.symbol[0]}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm uppercase leading-tight">{result.symbol}</p>
                                        <p className="text-xs text-tab-inactive truncate">{result.name}{result.exchange ? ` · ${result.exchange}` : ""}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quantity and Price Row */}
                <div className="flex gap-4">
                    <div className="glass rounded-xl p-4 flex-1 border border-glass-border">
                        <label className="block text-xs font-semibold text-tab-inactive uppercase tracking-wider mb-2">
                            Quantity
                        </label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0.00"
                            step="any"
                            className="w-full bg-transparent text-xl font-bold placeholder-foreground/20 focus:outline-none"
                        />
                    </div>
                    <div className="glass rounded-xl p-4 flex-1 flex flex-col justify-between relative border border-glass-border">
                        <div className="flex justify-between items-start mb-2">
                            <label className="block text-xs font-semibold text-tab-inactive uppercase tracking-wider">
                                Price / unit
                            </label>
                            <div className="flex gap-1 bg-foreground/10 p-0.5 rounded-md -mt-1 -mr-1">
                                <button type="button" onClick={() => setTradeCurrency("USD")} className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${tradeCurrency === "USD" ? "bg-background shadow-sm font-bold text-foreground" : "text-tab-inactive"}`}>USD</button>
                                <button type="button" onClick={() => setTradeCurrency("CAD")} className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${tradeCurrency === "CAD" ? "bg-background shadow-sm font-bold text-foreground" : "text-tab-inactive"}`}>CAD</button>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <span className="text-xl font-bold mr-1 text-tab-inactive">{tradeCurrency === "CAD" ? "C$" : "$"}</span>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0.00"
                                step="any"
                                className="w-full bg-transparent text-xl font-bold placeholder-foreground/20 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Date and Platform */}
                <div className="space-y-3">
                    <div className="glass rounded-xl p-4 flex items-center justify-between border border-glass-border">
                        <label className="text-sm font-semibold">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-transparent text-right font-medium focus:outline-none text-accent"
                        />
                    </div>
                    <div className="glass rounded-xl p-4 flex items-center justify-between border border-glass-border">
                        <label className="text-sm font-semibold">Platform</label>
                        <input
                            type="text"
                            value={platform}
                            onChange={(e) => setPlatform(e.target.value)}
                            placeholder="e.g. Questrade"
                            className="bg-transparent text-right font-medium focus:outline-none text-accent w-1/2"
                        />
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    className={`w-full py-4 mt-4 rounded-xl text-white font-bold text-lg shadow-lg active:scale-[0.98] transition-transform duration-200 ${tradeType === "BUY" ? "bg-accent shadow-accent/30" : "bg-red-500 shadow-red-500/30"}`}
                >
                    Confirm {tradeType === "BUY" ? "Purchase" : "Sale"}
                </button>
            </form>
        </div>
    );
}
