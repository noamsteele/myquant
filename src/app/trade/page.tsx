"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePortfolio } from "@/context/PortfolioContext";

export default function TradeInput() {
    const router = useRouter();
    const { addTrade } = usePortfolio();

    const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
    const [ticker, setTicker] = useState("");
    const [quantity, setQuantity] = useState("");
    const [price, setPrice] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [platform, setPlatform] = useState("Questrade");

    const handleSubmit = () => {
        if (!ticker || !quantity || !price) return;

        addTrade({
            type: tradeType,
            ticker: ticker.toUpperCase(),
            quantity: parseFloat(quantity),
            price: parseFloat(price),
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

            <form className="space-y-4">
                {/* Ticker Input */}
                <div className="glass rounded-xl p-4">
                    <label className="block text-xs font-semibold text-tab-inactive uppercase tracking-wider mb-2">
                        Asset Ticker
                    </label>
                    <input
                        type="text"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value)}
                        placeholder="e.g. AAPL, BTC"
                        className="w-full bg-transparent text-xl font-bold placeholder-foreground/20 focus:outline-none uppercase"
                    />
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
                    <div className="glass rounded-xl p-4 flex-1">
                        <label className="block text-xs font-semibold text-tab-inactive uppercase tracking-wider mb-2">
                            Price per unit
                        </label>
                        <div className="flex items-center">
                            <span className="text-xl font-bold mr-1">$</span>
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
                    type="button"
                    onClick={handleSubmit}
                    className={`w-full py-4 mt-8 rounded-xl text-white font-bold text-lg shadow-lg active:scale-[0.98] transition-transform duration-200 ${tradeType === "BUY" ? "bg-accent shadow-accent/30" : "bg-red-500 shadow-red-500/30"
                        }`}
                >
                    Confirm {tradeType === "BUY" ? "Purchase" : "Sale"}
                </button>
            </form>
        </div>
    );
}
