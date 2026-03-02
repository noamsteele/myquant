"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePortfolio } from "@/context/PortfolioContext";

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

    const [searchResults, setSearchResults] = useState<{ id: string, name: string, symbol: string, thumb: string }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // CoinGecko Search API Debounce
    useEffect(() => {
        const fetchAssets = async () => {
            if (ticker.trim().length < 2) {
                setSearchResults([]);
                setShowDropdown(false);
                return;
            }

            // Avoid refetching if the exact ticker was just selected
            if (!showDropdown && searchResults.some(r => r.symbol.toUpperCase() === ticker.toUpperCase())) return;

            setIsSearching(true);
            try {
                const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${ticker}`);
                const data = await res.json();
                if (data && data.coins) {
                    setSearchResults(data.coins.slice(0, 5)); // Limit to top 5
                    setShowDropdown(true);
                }
            } catch (err) {
                console.error("CoinGecko search failed:", err);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(fetchAssets, 400); // 400ms debounce
        return () => clearTimeout(timeoutId);
    }, [ticker, showDropdown, searchResults]);

    const handleSelect = (symbol: string) => {
        setTicker(symbol.toUpperCase());
        setShowDropdown(false);
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
            platform
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
            <div className="glass p-1 rounded-xl flex mb-6">
                <button
                    onClick={() => setTradeType("BUY")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${tradeType === "BUY" ? "bg-accent text-white shadow-md" : "text-tab-inactive transparent"
                        }`}
                >
                    Buy
                </button>
                <button
                    onClick={() => setTradeType("SELL")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${tradeType === "SELL" ? "bg-red-500 text-white shadow-md" : "text-tab-inactive transparent"
                        }`}
                >
                    Sell
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Ticker Input */}
                <div className="glass rounded-xl p-4 relative z-20 overflow-visible">
                    <label className="block text-xs font-semibold text-tab-inactive uppercase tracking-wider mb-2">
                        Asset Ticker
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
                            placeholder="e.g. AAPL, BTC"
                            className="w-full bg-transparent text-xl font-bold placeholder-foreground/20 focus:outline-none uppercase"
                        />
                        {isSearching && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                        )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showDropdown && searchResults.length > 0 && (
                        <div className="absolute left-0 right-0 top-[110%] bg-[#f2f2f7] dark:bg-[#1C1C1E] border border-glass-border rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] max-h-60 overflow-y-auto overflow-hidden text-foreground">
                            {searchResults.map((coin) => (
                                <div
                                    key={coin.id}
                                    onClick={() => handleSelect(coin.symbol)}
                                    className="flex items-center gap-3 p-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer border-b border-glass-border last:border-0"
                                >
                                    {coin.thumb && <img src={coin.thumb} alt={coin.symbol} className="w-6 h-6 rounded-full" />}
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm uppercase">{coin.symbol}</span>
                                        <span className="text-xs text-tab-inactive">{coin.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quantity and Price Row */}
                <div className="flex gap-4">
                    <div className="glass rounded-xl p-4 flex-1">
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
                    <div className="glass rounded-xl p-4 flex-1 flex flex-col justify-between relative">
                        <div className="flex justify-between items-start mb-2">
                            <label className="block text-xs font-semibold text-tab-inactive uppercase tracking-wider">
                                Price per unit
                            </label>
                            <div className="flex gap-1 bg-foreground/10 p-0.5 rounded-lg -mt-2 -mr-2">
                                <button type="button" onClick={() => setTradeCurrency("USD")} className={`text-[10px] px-1.5 py-0.5 rounded-md transition-colors ${tradeCurrency === "USD" ? 'bg-background shadow-sm font-bold text-foreground' : 'text-tab-inactive hover:text-foreground'}`}>USD</button>
                                <button type="button" onClick={() => setTradeCurrency("CAD")} className={`text-[10px] px-1.5 py-0.5 rounded-md transition-colors ${tradeCurrency === "CAD" ? 'bg-background shadow-sm font-bold text-foreground' : 'text-tab-inactive hover:text-foreground'}`}>CAD</button>
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

                {/* Date and Platform Row */}
                <div className="space-y-4">
                    <div className="glass rounded-xl p-4 flex items-center justify-between">
                        <label className="text-sm font-semibold">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-transparent text-right font-medium focus:outline-none text-accent"
                        />
                    </div>

                    <div className="glass rounded-xl p-4 flex items-center justify-between">
                        <label className="text-sm font-semibold">Platform</label>
                        <div className="relative">
                            <select
                                value={platform}
                                onChange={(e) => setPlatform(e.target.value)}
                                className="appearance-none bg-transparent text-right font-medium focus:outline-none text-accent pr-4 z-10 relative cursor-pointer"
                            >
                                <option value="Questrade">Questrade</option>
                                <option value="Binance">Binance</option>
                                <option value="Wealthsimple">Wealthsimple</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className={`w-full py-4 mt-8 rounded-xl text-white font-bold text-lg shadow-lg active:scale-[0.98] transition-transform duration-200 ${tradeType === "BUY" ? "bg-accent shadow-accent/30" : "bg-red-500 shadow-red-500/30"
                        }`}
                >
                    Confirm {tradeType === "BUY" ? "Purchase" : "Sale"}
                </button>
            </form>
        </div>
    );
}
