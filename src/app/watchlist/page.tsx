"use client";

import { useState, useEffect, useMemo } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import {
    Search, Plus, Trash2, Activity, BarChart2, Bitcoin, X,
    TrendingUp, TrendingDown, Calendar, Target, Zap, Globe,
    BarChart, DollarSign, Percent, ChevronRight, AlertCircle, RefreshCcw,
} from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ─── Types ─────────────────────────────────────────────────────── */
type SearchResult = {
    symbol: string; name: string; thumb?: string; exchange?: string;
    assetType: "stock" | "etf" | "crypto";
};

type AnalysisData = {
    assetType: "stock" | "crypto";
    name: string; ticker: string; price: number; priceCAD?: number;
    // Stock
    change1d?: number; exchange?: string | null; sector?: string | null;
    industry?: string | null; description?: string | null;
    volume?: number; avgVolume?: number; marketCap?: number;
    high52w?: number; low52w?: number; high24h?: number; low24h?: number;
    open?: number; previousClose?: number;
    peRatio?: number | null; forwardPE?: number | null;
    eps?: number | null; forwardEps?: number | null;
    pbRatio?: number | null; psRatio?: number | null;
    dividendYield?: number | null; dividendRate?: number | null; payoutRatio?: number | null;
    beta?: number | null; shortRatio?: number | null;
    roe?: number | null; debtToEquity?: number | null;
    revenueGrowth?: number | null; earningsGrowth?: number | null;
    earningsDate?: { date: string; daysUntil: number | null } | null;
    exDividendDate?: { date: string; daysUntil: number | null } | null;
    targetMeanPrice?: number | null; analystRating?: string | null; numberOfAnalysts?: number | null;
    // Crypto
    change24h?: number; change7d?: number; change30d?: number;
    marketCapRank?: number | null; volume24h?: number;
    circulatingSupply?: number; totalSupply?: number | null; maxSupply?: number | null;
    ath?: number; athDate?: string | null; atl?: number;
    upcomingEvent?: { type: string; label: string; date: string; daysUntil: number } | null;
};

/* ─── Helpers ───────────────────────────────────────────────────── */
const META_KEY = "myquant_watchlist_meta";
function loadMeta(): Record<string, "stock" | "etf" | "crypto"> {
    try { const s = localStorage.getItem(META_KEY); return s ? JSON.parse(s) : {}; } catch { return {}; }
}
function saveMeta(meta: Record<string, "stock" | "etf" | "crypto">) {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
}
const TAG_STYLE: Record<string, string> = {
    stock: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    etf: "bg-purple-500/15 text-purple-400 border-purple-500/25",
    crypto: "bg-orange-500/15 text-orange-400 border-orange-500/25",
};
function fmt(n: number | null | undefined, d = 2) {
    if (n == null || isNaN(n)) return "—";
    return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtCompact(n: number | null | undefined) {
    if (n == null || isNaN(n)) return "—";
    if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
    if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    return n.toLocaleString("en-US");
}
function fmtSupply(n: number | null | undefined) {
    if (n == null || isNaN(n)) return "—";
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
    return n.toLocaleString("en-US");
}

/* ─── Sub-components ─────────────────────────────────────────────── */
function StatTile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
    return (
        <div className="bg-white/4 rounded-xl p-3.5 border border-white/6 flex flex-col gap-0.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">{label}</p>
            <p className={`text-sm font-bold leading-tight mt-0.5 ${color || "text-white"}`}>{value}</p>
            {sub && <p className="text-[10px] text-white/35 font-medium">{sub}</p>}
        </div>
    );
}

function ChartTooltip({ active, payload, label, symbol }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: "#07111f", border: "1px solid rgba(50,100,200,0.25)", borderRadius: 8, padding: "6px 12px", fontSize: 11 }}>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>{label}</p>
            <p style={{ color: "#fff", fontWeight: 700 }}>{symbol}{Number(payload[0].value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
    );
}

function DateBadge({ icon: Icon, label, date, daysUntil, color }: {
    icon: any; label: string; date: string; daysUntil: number | null; color: string;
}) {
    const urgent = daysUntil != null && daysUntil <= 14;
    return (
        <div className={`flex items-center gap-3 rounded-xl p-3.5 border ${urgent ? "border-yellow-500/30 bg-yellow-500/8" : "bg-white/4 border-white/6"}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={17} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</p>
                <p className="text-sm font-bold text-white leading-tight">{date}</p>
            </div>
            {daysUntil != null && (
                <div className={`text-xs font-bold flex-shrink-0 ${urgent ? "text-yellow-400" : "text-white/40"}`}>
                    {daysUntil === 0 ? "Today" : daysUntil < 0 ? `${Math.abs(daysUntil)}d ago` : `in ${daysUntil}d`}
                </div>
            )}
        </div>
    );
}

function AnalystBar({ rating, count, target, priceUSD, fxRate }: {
    rating: string | null; count: number | null; target: number | null; priceUSD: number; fxRate: number;
}) {
    if (!rating) return null;
    const lower = rating.toLowerCase();
    const isBuy = lower.includes("buy") || lower.includes("outperform") || lower.includes("overweight") || lower.includes("strong buy");
    const isSell = lower.includes("sell") || lower.includes("underperform") || lower.includes("underweight");
    const color = isBuy ? "text-[#00e5a0]" : isSell ? "text-[#ff3d57]" : "text-yellow-400";
    const upside = target && priceUSD ? ((target - priceUSD) / priceUSD) * 100 : null;
    return (
        <div className="bg-white/4 rounded-xl p-4 border border-white/6 flex items-center justify-between gap-4">
            <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">Analyst Consensus</p>
                <p className={`text-base font-bold ${color}`}>{rating}</p>
                {count != null && <p className="text-[10px] text-white/35 font-medium">{count} analysts</p>}
            </div>
            {target != null && (
                <div className="text-right">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">Price Target</p>
                    <p className="text-sm font-bold text-white">${fmt(target)} / C${fmt(target * fxRate)}</p>
                    {upside != null && (
                        <p className={`text-[10px] font-bold ${upside >= 0 ? "text-[#00e5a0]" : "text-[#ff3d57]"}`}>
                            {upside >= 0 ? "+" : ""}{upside.toFixed(1)}% upside
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
    return (
        <div className="flex items-center gap-2 mb-2.5">
            <Icon size={13} className="text-accent" />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/50">{title}</h3>
        </div>
    );
}

/* ─── Currency toggle pill ───────────────────────────────────────── */
function CurrencyToggle({ value, onChange }: { value: "USD" | "CAD"; onChange: (v: "USD" | "CAD") => void }) {
    return (
        <div className="flex bg-white/8 rounded-lg p-0.5 border border-white/10">
            {(["USD", "CAD"] as const).map((c) => (
                <button key={c} onClick={() => onChange(c)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${value === c ? "bg-accent text-white shadow" : "text-white/40 hover:text-white/70"}`}>
                    {c}
                </button>
            ))}
        </div>
    );
}

/* ─── Main ───────────────────────────────────────────────────────── */
export default function Watchlist() {
    const { watchlist, addToWatchlist, removeFromWatchlist, fxRate: globalFxRate } = usePortfolio();

    const [searchQuery, setSearchQuery] = useState("");
    const [searchMode, setSearchMode] = useState<"stock" | "crypto">("stock");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [watchlistPrices, setWatchlistPrices] = useState<Record<string, { price: number; change: number }>>({});
    const [meta, setMeta] = useState<Record<string, "stock" | "etf" | "crypto">>({});

    // Modal state
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [chartData, setChartData] = useState<{ date: string; price: number }[]>([]);
    const [modalCurrency, setModalCurrency] = useState<"USD" | "CAD">("USD");

    // Live FX rate — fallback to global
    const [liveFxRate, setLiveFxRate] = useState(globalFxRate);

    useEffect(() => { setMeta(loadMeta()); }, []);

    // Fetch watchlist prices + FX rate
    useEffect(() => {
        if (!watchlist.length) return;
        fetch(`/api/prices?tickers=${watchlist.join(",")},CAD=X`)
            .then(r => r.json())
            .then(data => {
                setWatchlistPrices(data);
                if (data["CAD=X"]?.price) setLiveFxRate(data["CAD=X"].price);
            })
            .catch(console.error);
    }, [watchlist]);

    // Search debounce
    useEffect(() => {
        const run = async () => {
            const q = searchQuery.trim();
            if (q.length < 1) { setSearchResults([]); return; }
            setIsSearching(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${searchMode}`);
                const data = await res.json();
                setSearchResults((data.results ?? []).slice(0, 6).map((r: any) => ({
                    symbol: r.symbol.toUpperCase(), name: r.name, thumb: r.thumb, exchange: r.exchange,
                    assetType: r.type === "crypto" ? "crypto" : (r.exchange?.includes("ETF") ? "etf" : "stock"),
                })));
            } catch { setSearchResults([]); }
            finally { setIsSearching(false); }
        };
        const id = setTimeout(run, 350);
        return () => clearTimeout(id);
    }, [searchQuery, searchMode]);

    useEffect(() => { setSearchResults([]); setSearchQuery(""); }, [searchMode]);

    // Fetch analysis + chart when modal opens
    useEffect(() => {
        if (!selectedTicker) { setAnalysis(null); setChartData([]); return; }
        setAnalysisLoading(true);
        setAnalysisError(null);
        setChartData([]);
        Promise.all([
            fetch(`/api/analysis?ticker=${selectedTicker}`).then(r => r.json()),
            fetch(`/api/chart?ticker=${selectedTicker}`).then(r => r.json()),
        ]).then(([aData, cData]) => {
            if (aData.error) { setAnalysisError(aData.error); setAnalysis(null); }
            else setAnalysis(aData);
            setChartData(cData.data ?? []);
        }).catch(e => setAnalysisError(e.message || "Network error"))
            .finally(() => setAnalysisLoading(false));
    }, [selectedTicker]);

    const handleAdd = (result: SearchResult) => {
        addToWatchlist(result.symbol);
        const next = { ...meta, [result.symbol]: result.assetType };
        setMeta(next); saveMeta(next);
        setSearchQuery(""); setSearchResults([]);
    };
    const handleRemove = (ticker: string) => {
        removeFromWatchlist(ticker);
        const next = { ...meta }; delete next[ticker]; setMeta(next); saveMeta(next);
        if (selectedTicker === ticker) setSelectedTicker(null);
    };

    // Chart colour based on 30d direction
    const chartColor = useMemo(() => {
        if (chartData.length < 2) return "#00e5a0";
        return chartData[chartData.length - 1].price >= chartData[0].price ? "#00e5a0" : "#ff3d57";
    }, [chartData]);

    // Modal price conversion
    const mCurrSym = modalCurrency === "CAD" ? "C$" : "$";
    const mFx = modalCurrency === "CAD" ? liveFxRate : 1;
    const px = (usdVal: number | null | undefined) => usdVal != null ? usdVal * mFx : null;

    const isStock = analysis?.assetType === "stock";
    const isCrypto = analysis?.assetType === "crypto";

    // Chart data scaled to current modal currency
    const chartDataScaled = useMemo(() =>
        chartData.map(d => ({ ...d, price: parseFloat((d.price * mFx).toFixed(2)) })),
        [chartData, mFx]
    );

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 pt-8 px-4 font-sans space-y-5">
            <header className="mb-1">
                <h1 className="text-3xl font-bold tracking-tight">Watchlist</h1>
                <p className="text-tab-inactive text-sm font-medium">Research assets before you buy</p>
            </header>

            {/* Search mode toggle */}
            <div className="glass p-1 rounded-xl flex border border-glass-border">
                <button onClick={() => setSearchMode("stock")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${searchMode === "stock" ? "bg-foreground/10 text-foreground shadow" : "text-tab-inactive"}`}>
                    <BarChart2 size={13} /> Stock / ETF
                </button>
                <button onClick={() => setSearchMode("crypto")}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${searchMode === "crypto" ? "bg-foreground/10 text-foreground shadow" : "text-tab-inactive"}`}>
                    <Bitcoin size={13} /> Crypto
                </button>
            </div>

            {/* Search input */}
            <div className="glass rounded-xl p-4 relative z-20 overflow-visible border border-glass-border">
                <div className="relative flex items-center">
                    <Search className="absolute left-0 text-tab-inactive" size={17} />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        onBlur={() => setTimeout(() => setSearchResults([]), 200)}
                        placeholder={searchMode === "stock" ? "Search stocks & ETFs..." : "Search crypto..."}
                        className="w-full bg-transparent pl-7 py-1.5 font-semibold placeholder-foreground/25 focus:outline-none uppercase text-base" />
                    {isSearching && <div className="absolute right-0 w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />}
                </div>
                {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-[110%] bg-[#f0f2f7] dark:bg-[#0d1a30] border border-glass-border rounded-lg shadow-2xl max-h-72 overflow-y-auto z-50">
                        {searchResults.map(r => (
                            <div key={r.symbol} onClick={() => handleAdd(r)}
                                className="flex items-center justify-between px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer border-b border-glass-border last:border-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    {r.thumb
                                        ? <img src={r.thumb} alt={r.symbol} className="w-7 h-7 rounded-full flex-shrink-0" />
                                        : <div className="w-7 h-7 rounded-md bg-accent/15 flex items-center justify-center text-accent font-bold text-xs flex-shrink-0">{r.symbol[0]}</div>}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">{r.symbol}</span>
                                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${TAG_STYLE[r.assetType]}`}>{r.assetType.toUpperCase()}</span>
                                        </div>
                                        <p className="text-xs text-tab-inactive truncate">{r.name}{r.exchange ? ` · ${r.exchange}` : ""}</p>
                                    </div>
                                </div>
                                <Plus size={17} className="text-accent flex-shrink-0 ml-2" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Watchlist cards ─── */}
            <div className="space-y-3">
                {watchlist.length === 0 ? (
                    <div className="glass rounded-xl p-10 flex flex-col items-center justify-center text-center border border-glass-border">
                        <Activity size={28} className="text-tab-inactive mb-4" />
                        <h4 className="text-base font-bold mb-2">Empty Watchlist</h4>
                        <p className="text-tab-inactive text-sm font-medium leading-relaxed">Search for a stock, ETF, or crypto above to start tracking.</p>
                    </div>
                ) : (
                    watchlist.filter(t => t !== "CAD=X").map((ticker) => {
                        const data = watchlistPrices[ticker] || { price: 0, change: 0 };
                        const priceUSD = data.price;
                        const priceCAD = data.price * liveFxRate;
                        const isPositive = data.change >= 0;
                        const assetLabel = meta[ticker];
                        const isCryptoCard = assetLabel === "crypto";

                        return (
                            <div key={ticker}
                                onClick={() => setSelectedTicker(ticker)}
                                className="glass rounded-xl p-4 border border-glass-border active:scale-[0.98] transition-transform duration-150 cursor-pointer hover:brightness-105">
                                <div className="flex items-center justify-between">
                                    {/* Left: icon + name */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-md bg-accent/15 flex items-center justify-center font-bold text-base text-accent border border-accent/20">
                                            {ticker[0]}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-base leading-tight uppercase">{ticker}</h4>
                                                {assetLabel && (
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${TAG_STYLE[assetLabel]}`}>{assetLabel.toUpperCase()}</span>
                                                )}
                                            </div>
                                            {/* Change badge */}
                                            <div className={`flex items-center gap-1 text-xs font-semibold mt-0.5 ${isPositive ? "text-[#00e5a0]" : "text-[#ff3d57]"}`}>
                                                {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                                <span>{isPositive ? "+" : ""}{data.change ? data.change.toFixed(2) : "0.00"}%</span>
                                                <span className="text-white/25 font-medium">{isCryptoCard ? "24h" : "today"}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Right: dual prices */}
                                    <div className="flex items-center gap-2">
                                        <div className="text-right">
                                            {priceUSD ? (
                                                <>
                                                    <p className="font-bold text-base leading-tight">
                                                        ${priceUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                    <p className="text-xs text-tab-inactive font-medium leading-tight">
                                                        C${priceCAD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="font-semibold text-base text-tab-inactive">—</p>
                                            )}
                                        </div>
                                        <ChevronRight size={15} className="text-white/20" />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ─── Analysis Modal ─── */}
            {selectedTicker && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setSelectedTicker(null)} />
                    <div className="relative bg-[#07111f] w-full max-h-[92vh] rounded-t-2xl border border-[rgba(50,100,200,0.2)] shadow-2xl flex flex-col overflow-hidden">
                        <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

                        {/* Modal header */}
                        <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0 border-b border-white/6">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-accent/20 flex items-center justify-center font-bold text-xl text-accent border border-accent/25">
                                    {selectedTicker[0]}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold leading-tight">{selectedTicker}</h2>
                                        {meta[selectedTicker] && (
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${TAG_STYLE[meta[selectedTicker]]}`}>{meta[selectedTicker].toUpperCase()}</span>
                                        )}
                                    </div>
                                    <p className="text-tab-inactive text-xs font-medium">{analysis?.name || "Loading…"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* USD/CAD toggle */}
                                <CurrencyToggle value={modalCurrency} onChange={setModalCurrency} />
                                <button onClick={e => { e.stopPropagation(); handleRemove(selectedTicker); }}
                                    className="w-8 h-8 rounded-md bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/25 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                                <button onClick={() => setSelectedTicker(null)}
                                    className="w-8 h-8 rounded-md bg-white/8 flex items-center justify-center text-white/60 hover:bg-white/15 transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto flex-1 p-5 space-y-5">

                            {analysisLoading && (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                    <p className="text-tab-inactive text-sm font-medium">Loading analysis…</p>
                                </div>
                            )}

                            {!analysisLoading && analysisError && (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                    <AlertCircle size={28} className="text-red-400" />
                                    <p className="text-sm font-semibold text-white/70">Could not load analysis data.</p>
                                    <p className="text-xs text-white/35 bg-white/4 rounded-lg px-3 py-2 border border-white/6 font-mono">{analysisError}</p>
                                </div>
                            )}

                            {!analysisLoading && analysis && (() => {
                                // Compute currency-aware prices
                                const displayPrice = (analysis.price ?? 0) * mFx;
                                const displayChange = isStock
                                    ? (analysis.change1d ?? 0)
                                    : (analysis.change24h ?? 0);
                                const changeIsPositive = displayChange >= 0;
                                const changeLabel = isCrypto ? "24h" : "today";

                                return (
                                    <>
                                        {/* Hero price */}
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Price ({modalCurrency})</p>
                                                <p className="text-3xl font-bold tracking-tight">{mCurrSym}{displayPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                <p className="text-xs text-white/30 mt-0.5">
                                                    Also: {modalCurrency === "USD" ? `C$${fmt((analysis.price ?? 0) * liveFxRate)}` : `$${fmt(analysis.price)}`}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className={`flex items-center gap-1 justify-end text-base font-bold ${changeIsPositive ? "text-[#00e5a0]" : "text-[#ff3d57]"}`}>
                                                    {changeIsPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                                    {changeIsPositive ? "+" : ""}{fmt(displayChange)}%
                                                </div>
                                                <p className="text-[10px] text-white/35 font-medium">{changeLabel}</p>
                                                {isCrypto && analysis.change7d != null && (
                                                    <p className={`text-xs font-semibold mt-0.5 ${(analysis.change7d) >= 0 ? "text-[#00e5a0]" : "text-[#ff3d57]"}`}>
                                                        {analysis.change7d >= 0 ? "+" : ""}{fmt(analysis.change7d)}% 7d
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* 30-day chart */}
                                        <div>
                                            <SectionHeader icon={Activity} title={`30-Day Price (${modalCurrency})`} />
                                            {chartDataScaled.length >= 2 ? (
                                                <div className="h-[150px] bg-white/3 rounded-xl overflow-hidden">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={chartDataScaled} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
                                                            <defs>
                                                                <linearGradient id="cgGrad" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                                                                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                                            <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                                                            <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} tickLine={false} axisLine={false} width={50}
                                                                tickFormatter={v => `${mCurrSym}${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : parseFloat(v.toFixed(2))}`}
                                                                domain={["auto", "auto"]} />
                                                            <Tooltip content={<ChartTooltip symbol={mCurrSym} />} />
                                                            <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2}
                                                                fill="url(#cgGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: chartColor }} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-white/30 bg-white/4 rounded-xl p-3 text-center border border-white/6">No chart data available.</p>
                                            )}
                                        </div>

                                        {/* ─── STOCK SECTIONS ─── */}
                                        {isStock && (
                                            <>
                                                <div>
                                                    <SectionHeader icon={BarChart} title="Key Stats" />
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <StatTile label="Market Cap" value={fmtCompact((analysis.marketCap ?? 0) * mFx)} sub={modalCurrency} />
                                                        <StatTile label="Volume" value={fmtSupply(analysis.volume)} sub={`Avg ${fmtSupply(analysis.avgVolume)}`} />
                                                        <StatTile label="52W High" value={`${mCurrSym}${fmt(px(analysis.high52w))}`} />
                                                        <StatTile label="52W Low" value={`${mCurrSym}${fmt(px(analysis.low52w))}`} />
                                                        <StatTile label="Day High" value={`${mCurrSym}${fmt(px(analysis.high24h))}`} />
                                                        <StatTile label="Day Low" value={`${mCurrSym}${fmt(px(analysis.low24h))}`} />
                                                        <StatTile label="Open" value={`${mCurrSym}${fmt(px(analysis.open))}`} />
                                                        <StatTile label="Prev. Close" value={`${mCurrSym}${fmt(px(analysis.previousClose))}`} />
                                                        {analysis.sector && <StatTile label="Sector" value={analysis.sector} />}
                                                        {analysis.beta != null && <StatTile label="Beta" value={fmt(analysis.beta)} />}
                                                    </div>
                                                </div>

                                                <div>
                                                    <SectionHeader icon={Percent} title="Valuation Ratios" />
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <StatTile label="P/E (TTM)" value={analysis.peRatio != null ? fmt(analysis.peRatio) : "—"} />
                                                        <StatTile label="Fwd P/E" value={analysis.forwardPE != null ? fmt(analysis.forwardPE) : "—"} />
                                                        <StatTile label="EPS (TTM)" value={analysis.eps != null ? `${mCurrSym}${fmt(px(analysis.eps))}` : "—"} />
                                                        <StatTile label="Fwd EPS" value={analysis.forwardEps != null ? `${mCurrSym}${fmt(px(analysis.forwardEps))}` : "—"} />
                                                        <StatTile label="P/B Ratio" value={analysis.pbRatio != null ? fmt(analysis.pbRatio) : "—"} />
                                                        <StatTile label="P/S Ratio" value={analysis.psRatio != null ? fmt(analysis.psRatio) : "—"} />
                                                        {analysis.roe != null && <StatTile label="ROE" value={`${fmt(analysis.roe)}%`} color={analysis.roe >= 0 ? "text-[#00e5a0]" : "text-[#ff3d57]"} />}
                                                        {analysis.debtToEquity != null && <StatTile label="Debt/Equity" value={fmt(analysis.debtToEquity)} />}
                                                        {analysis.revenueGrowth != null && <StatTile label="Revenue Growth" value={`${fmt(analysis.revenueGrowth)}%`} color={analysis.revenueGrowth >= 0 ? "text-[#00e5a0]" : "text-[#ff3d57]"} />}
                                                        {analysis.earningsGrowth != null && <StatTile label="Earnings Growth" value={`${fmt(analysis.earningsGrowth)}%`} color={analysis.earningsGrowth >= 0 ? "text-[#00e5a0]" : "text-[#ff3d57]"} />}
                                                    </div>
                                                </div>

                                                {analysis.dividendYield != null && analysis.dividendYield > 0 && (
                                                    <div>
                                                        <SectionHeader icon={DollarSign} title="Dividends" />
                                                        <div className="grid grid-cols-2 gap-2.5">
                                                            <StatTile label="Dividend Yield" value={`${fmt(analysis.dividendYield)}%`} color="text-[#00e5a0]" />
                                                            <StatTile label="Annual Rate" value={analysis.dividendRate != null ? `${mCurrSym}${fmt(px(analysis.dividendRate))}` : "—"} />
                                                            {analysis.payoutRatio != null && <StatTile label="Payout Ratio" value={`${fmt(analysis.payoutRatio)}%`} />}
                                                            {analysis.shortRatio != null && <StatTile label="Short Ratio" value={fmt(analysis.shortRatio)} />}
                                                        </div>
                                                    </div>
                                                )}

                                                {analysis.analystRating && (
                                                    <div>
                                                        <SectionHeader icon={Target} title="Analyst Estimates" />
                                                        <AnalystBar
                                                            rating={analysis.analystRating}
                                                            count={analysis.numberOfAnalysts ?? null}
                                                            target={analysis.targetMeanPrice ?? null}
                                                            priceUSD={analysis.price}
                                                            fxRate={liveFxRate}
                                                        />
                                                    </div>
                                                )}

                                                {(analysis.earningsDate || analysis.exDividendDate) && (
                                                    <div>
                                                        <SectionHeader icon={Calendar} title="Upcoming Dates" />
                                                        <div className="space-y-2">
                                                            {analysis.earningsDate && (
                                                                <DateBadge icon={Zap} label="Next Earnings"
                                                                    date={analysis.earningsDate.date} daysUntil={analysis.earningsDate.daysUntil}
                                                                    color="bg-yellow-500/15 text-yellow-400" />
                                                            )}
                                                            {analysis.exDividendDate && (
                                                                <DateBadge icon={DollarSign} label="Ex-Dividend Date"
                                                                    date={analysis.exDividendDate.date} daysUntil={analysis.exDividendDate.daysUntil}
                                                                    color="bg-green-500/15 text-green-400" />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* ─── CRYPTO SECTIONS ─── */}
                                        {isCrypto && (
                                            <>
                                                <div>
                                                    <SectionHeader icon={Globe} title="Market Stats" />
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <StatTile label="Market Cap" value={fmtCompact((analysis.marketCap ?? 0) * mFx)}
                                                            sub={analysis.marketCapRank ? `Rank #${analysis.marketCapRank}` : undefined} />
                                                        <StatTile label="24h Volume" value={fmtCompact((analysis.volume24h ?? 0) * mFx)} />
                                                        <StatTile label="24h High" value={`${mCurrSym}${fmt(px(analysis.high24h))}`} />
                                                        <StatTile label="24h Low" value={`${mCurrSym}${fmt(px(analysis.low24h))}`} />
                                                        <StatTile label="7d Change" value={`${(analysis.change7d ?? 0) >= 0 ? "+" : ""}${fmt(analysis.change7d)}%`}
                                                            color={(analysis.change7d ?? 0) >= 0 ? "text-[#00e5a0]" : "text-[#ff3d57]"} />
                                                        <StatTile label="30d Change" value={`${(analysis.change30d ?? 0) >= 0 ? "+" : ""}${fmt(analysis.change30d)}%`}
                                                            color={(analysis.change30d ?? 0) >= 0 ? "text-[#00e5a0]" : "text-[#ff3d57]"} />
                                                        <StatTile label="All-Time High" value={`${mCurrSym}${fmt(px(analysis.ath))}`}
                                                            sub={analysis.athDate ? new Date(analysis.athDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : undefined} />
                                                        <StatTile label="All-Time Low" value={`${mCurrSym}${fmt(px(analysis.atl))}`} />
                                                    </div>
                                                </div>

                                                <div>
                                                    <SectionHeader icon={BarChart} title="Supply" />
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <StatTile label="Circulating" value={fmtSupply(analysis.circulatingSupply)} />
                                                        {analysis.totalSupply != null && <StatTile label="Total Supply" value={fmtSupply(analysis.totalSupply)} />}
                                                        {analysis.maxSupply != null && <StatTile label="Max Supply" value={fmtSupply(analysis.maxSupply)} />}
                                                        {analysis.circulatingSupply && analysis.maxSupply && (
                                                            <StatTile label="% Mined"
                                                                value={`${((analysis.circulatingSupply / analysis.maxSupply) * 100).toFixed(1)}%`}
                                                                color="text-orange-400" />
                                                        )}
                                                    </div>
                                                </div>

                                                {analysis.upcomingEvent && (
                                                    <div>
                                                        <SectionHeader icon={Calendar} title="Upcoming Events" />
                                                        <DateBadge icon={Zap}
                                                            label={analysis.upcomingEvent.type === "halving" ? "Next Halving" : analysis.upcomingEvent.type}
                                                            date={analysis.upcomingEvent.date} daysUntil={analysis.upcomingEvent.daysUntil}
                                                            color="bg-orange-500/15 text-orange-400" />
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {analysis.description && (
                                            <div>
                                                <SectionHeader icon={Globe} title="About" />
                                                <p className="text-sm text-white/55 leading-relaxed bg-white/4 rounded-xl p-4 border border-white/6">
                                                    {analysis.description}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        {/* Footer */}
                        <div className="px-5 pb-5 pt-3 flex-shrink-0">
                            <button onClick={() => setSelectedTicker(null)}
                                className="w-full py-3.5 bg-accent text-white rounded-xl font-bold text-base shadow-[0_4px_20px_rgba(41,121,255,0.4)] active:scale-[0.98] transition-transform">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
