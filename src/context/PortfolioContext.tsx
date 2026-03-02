"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Trade = {
    id: string;
    type: "BUY" | "SELL";
    ticker: string;
    quantity: number;
    price: number;
    tradeCurrency?: "USD" | "CAD";
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
    currency: "USD" | "CAD";
    setCurrency: (currency: "USD" | "CAD") => void;
    currencySymbol: string;
    watchlist: string[];
    addToWatchlist: (ticker: string) => void;
    removeFromWatchlist: (ticker: string) => void;
    removeTrade: (id: string) => void;
    importData: (jsonData: any) => boolean;
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
    const [livePrices, setLivePrices] = useState<Record<string, { name: string, price: number, change: number }>>({});
    const [currency, setCurrency] = useState<"USD" | "CAD">("USD");
    const [watchlist, setWatchlist] = useState<string[]>(["AAPL", "BTC-USD"]); // Default watch items

    // Load from localeStorage initially
    useEffect(() => {
        const saved = localStorage.getItem("myquant_trades");
        if (saved) {
            try {
                setTrades(JSON.parse(saved));
            } catch (e) { }
        }
        const savedCurrency = localStorage.getItem("myquant_currency");
        if (savedCurrency === "CAD" || savedCurrency === "USD") {
            setCurrency(savedCurrency);
        }
        const savedWatchlist = localStorage.getItem("myquant_watchlist");
        if (savedWatchlist) {
            try {
                setWatchlist(JSON.parse(savedWatchlist));
            } catch (e) { }
        }
    }, []);

    // Persist currency preference
    useEffect(() => {
        localStorage.setItem("myquant_currency", currency);
    }, [currency]);

    const currencySymbol = currency === "CAD" ? "C$" : "$";

    // Fetch live prices from our API when needed
    useEffect(() => {
        const allTickersSet = new Set([
            ...trades.map(t => t.ticker.toUpperCase()),
            ...watchlist.map(t => t.toUpperCase()),
            "CAD=X"
        ]);
        const tickers = Array.from(allTickersSet);

        // Find tickers we haven't fetched yet
        const toFetch = tickers.filter(t => !livePrices[t]);
        if (!toFetch.length) return;

        fetch(`/api/prices?tickers=${toFetch.join(",")}`)
            .then(res => res.json())
            .then(data => {
                setLivePrices(prev => ({ ...prev, ...data }));
            })
            .catch(err => console.error("Failed to fetch live prices", err));
    }, [trades, livePrices]);

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
        const latestFx = livePrices["CAD=X"]?.price || 1.35;

        trades.forEach(trade => {
            const ticker = trade.ticker.toUpperCase();
            const current = map.get(ticker) || { shares: 0, totalCost: 0 };

            const fxToUSD = trade.tradeCurrency === "CAD" ? (1 / latestFx) : 1;
            const normalizedPrice = trade.price * fxToUSD;

            if (trade.type === "BUY") {
                current.shares += trade.quantity;
                current.totalCost += (trade.quantity * normalizedPrice);
            } else if (trade.type === "SELL") {
                // Average cost algorithm
                const prevAvgCost = current.shares > 0 ? (current.totalCost / current.shares) : 0;
                current.shares -= trade.quantity;
                if (current.shares < 0) current.shares = 0; // prevent negative bounds if incorrect data entry
                current.totalCost = current.shares * prevAvgCost;
            }
            map.set(ticker, current);
        });

        const fxRate = currency === "CAD" ? (livePrices["CAD=X"]?.price || 1.35) : 1;

        const result: Holding[] = [];
        map.forEach((data, ticker) => {
            if (data.shares <= 0.000001) return; // ignore completely sold or floating-point err positions
            const costBasis = data.totalCost / data.shares;

            // Try live prices, fallback to mock, fallback to dummy
            const priceData = livePrices[ticker] || MOCK_PRICES[ticker] || { name: ticker, price: costBasis || 1.0, change: 0.0 };

            result.push({
                ticker,
                name: priceData.name,
                shares: data.shares,
                costBasis: costBasis * fxRate,
                currentPrice: priceData.price * fxRate,
                change: priceData.change,
            });
        });

        return result.sort((a, b) => (b.shares * b.currentPrice) - (a.shares * a.currentPrice));
    }, [trades, livePrices, currency]);

    const totalValue = holdings.reduce((acc, curr) => acc + (curr.shares * curr.currentPrice), 0);

    const addToWatchlist = (ticker: string) => {
        if (!watchlist.includes(ticker.toUpperCase())) {
            const next = [...watchlist, ticker.toUpperCase()];
            setWatchlist(next);
            localStorage.setItem("myquant_watchlist", JSON.stringify(next));
        }
    };

    const removeFromWatchlist = (ticker: string) => {
        const next = watchlist.filter(t => t !== ticker.toUpperCase());
        setWatchlist(next);
        localStorage.setItem("myquant_watchlist", JSON.stringify(next));
    };

    const removeTrade = (id: string) => {
        setTrades(prev => {
            const next = Array.isArray(prev) ? prev.filter(t => t.id !== id) : [];
            localStorage.setItem("myquant_trades", JSON.stringify(next));
            return next;
        });
    };

    const importData = (data: any) => {
        if (!data) return false;
        try {
            if (Array.isArray(data.trades)) {
                setTrades(data.trades);
                localStorage.setItem("myquant_trades", JSON.stringify(data.trades));
            }
            if (Array.isArray(data.watchlist)) {
                setWatchlist(data.watchlist);
                localStorage.setItem("myquant_watchlist", JSON.stringify(data.watchlist));
            }
            if (data.currency && (data.currency === "USD" || data.currency === "CAD")) {
                setCurrency(data.currency);
            }
            return true;
        } catch (e) {
            console.error("Data import error", e);
            return false;
        }
    };

    return (
        <PortfolioContext.Provider value={{ trades, holdings, totalValue, addTrade, currency, setCurrency, currencySymbol, watchlist, addToWatchlist, removeFromWatchlist, removeTrade, importData }}>
            {children}
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
