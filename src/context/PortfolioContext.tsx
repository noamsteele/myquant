"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Trade = {
    id: string;
    type: "BUY" | "SELL";
    ticker: string;
    quantity: number;
    price: number;
    date: string;
    platform: string;
};

export type Holding = {
    ticker: string;
    name: string;
    shares: number;
    costBasis: number; // cost per share average
    currentPrice: number; // simulated
    change: number; // simulated percentage
};

type PortfolioContextType = {
    trades: Trade[];
    holdings: Holding[];
    totalValue: number;
    addTrade: (trade: Omit<Trade, "id">) => void;
};

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

// A simple dictionary to give nice names / current mock prices for unknown tickers
const MOCK_PRICES: Record<string, { name: string, price: number, change: number }> = {
    "AAPL": { name: "Apple Inc.", price: 189.30, change: 1.2 },
    "BTC": { name: "Bitcoin", price: 62000.50, change: -2.3 },
    "ETH": { name: "Ethereum", price: 3100.20, change: 4.1 },
    "VTI": { name: "Vanguard Total Stock", price: 250.10, change: 0.8 },
    "TSLA": { name: "Tesla Inc.", price: 210.40, change: -1.5 },
    "MSFT": { name: "Microsoft", price: 420.00, change: 2.1 },
    "QQQ": { name: "Invesco QQQ", price: 440.50, change: 1.1 },
};

export const PortfolioProvider = ({ children }: { children: React.ReactNode }) => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localeStorage initially
    useEffect(() => {
        const saved = localStorage.getItem("myquant_trades");
        if (saved) {
            try {
                setTrades(JSON.parse(saved));
            } catch (e) { }
        }
        setIsLoaded(true);
    }, []);

    const addTrade = (tradeData: Omit<Trade, "id">) => {
        const newTrade: Trade = { ...tradeData, id: Date.now().toString() };
        setTrades(prev => {
            const next = [...prev, newTrade];
            localStorage.setItem("myquant_trades", JSON.stringify(next));
            return next;
        });
    };

    // Calculate holdings based on trades
    const holdings: Holding[] = React.useMemo(() => {
        const map = new Map<string, { shares: number, totalCost: number }>();

        trades.forEach(trade => {
            const ticker = trade.ticker.toUpperCase();
            const current = map.get(ticker) || { shares: 0, totalCost: 0 };

            if (trade.type === "BUY") {
                current.shares += trade.quantity;
                current.totalCost += (trade.quantity * trade.price);
            } else if (trade.type === "SELL") {
                // Average cost algorithm
                const prevAvgCost = current.shares > 0 ? (current.totalCost / current.shares) : 0;
                current.shares -= trade.quantity;
                if (current.shares < 0) current.shares = 0; // prevent negative bounds if incorrect data entry
                current.totalCost = current.shares * prevAvgCost;
            }
            map.set(ticker, current);
        });

        const result: Holding[] = [];
        map.forEach((data, ticker) => {
            if (data.shares <= 0.000001) return; // ignore completely sold or floating-point err positions
            const costBasis = data.totalCost / data.shares;
            const mockData = MOCK_PRICES[ticker] || { name: ticker, price: costBasis * 1.05, change: 5.0 };
            result.push({
                ticker,
                name: mockData.name,
                shares: data.shares,
                costBasis,
                currentPrice: mockData.price,
                change: mockData.change,
            });
        });

        return result.sort((a, b) => (b.shares * b.currentPrice) - (a.shares * a.currentPrice));
    }, [trades]);

    const totalValue = holdings.reduce((acc, curr) => acc + (curr.shares * curr.currentPrice), 0);

    // Only render children when client-side mounted to avoid hydration mismatch 
    // since localStorage is client-only.
    return (
        <PortfolioContext.Provider value={{ trades, holdings, totalValue, addTrade }}>
            {isLoaded ? children : <div className="min-h-screen bg-background text-foreground" />}
        </PortfolioContext.Provider>
    );
};

export const usePortfolio = () => {
    const context = useContext(PortfolioContext);
    if (context === undefined) {
        throw new Error("usePortfolio must be used within a PortfolioProvider");
    }
    return context;
};
