"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { Sparkles, BrainCircuit, ShieldAlert, ArrowRight } from "lucide-react";

export default function Insights() {
    const { holdings, totalValue } = usePortfolio();

    const generateInsights = () => {
        if (holdings.length === 0) {
            return [
                {
                    title: "Portfolio Empty",
                    desc: "It's a great time to start investing! Start logging your trades to see AI-generated asset mix insights.",
                    icon: <BrainCircuit size={20} />,
                    color: "text-accent",
                    bg: "bg-accent/10",
                }
            ];
        }

        const insights = [];

        // Analyze Diversification
        if (holdings.length < 3 && totalValue > 1000) {
            insights.push({
                title: "High Concentration Risk",
                desc: "Your portfolio is heavily concentrated in just a few assets. Consider adding ETFs or bonds to diversify and limit volatility exposure.",
                icon: <ShieldAlert size={20} />,
                color: "text-red-500",
                bg: "bg-red-500/10",
            });
        } else {
            insights.push({
                title: "Well Diversified Mix",
                desc: "You maintain a solid baseline of multiple assets, distributing volatility risk across the board effectively.",
                icon: <Sparkles size={20} />,
                color: "text-[#34C759]",
                bg: "bg-[#34C759]/10",
            });
        }

        // Crypto vs Traditional Analysis (Simple heuristic: assumes BTC/ETH/SOL are crypto)
        const cryptos = ["BTC", "BTC-USD", "ETH", "ETH-USD", "SOL", "SOL-USD", "DOGE"];
        const cryptoExposure = holdings.filter(h => cryptos.includes(h.ticker.toUpperCase())).reduce((acc, curr) => acc + (curr.shares * curr.currentPrice), 0);
        const cryptoPercent = (cryptoExposure / totalValue) * 100;

        if (cryptoPercent > 40) {
            insights.push({
                title: "Heavy Crypto Weighting",
                desc: `Your portfolio consists of ${cryptoPercent.toFixed(1)}% cryptocurrencies. While this offers high growth potential, it heavily increases your overall portfolio beta.`,
                icon: <BrainCircuit size={20} />,
                color: "text-[#AF52DE]",
                bg: "bg-[#AF52DE]/10",
            });
        } else if (cryptoPercent > 0 && cryptoPercent <= 10) {
            insights.push({
                title: "Optimal Growth Exposure",
                desc: `You hold a safe ${cryptoPercent.toFixed(1)}% in direct crypto assets, maximizing upside while shielding your total balance from severe corrections.`,
                icon: <Sparkles size={20} />,
                color: "text-accent",
                bg: "bg-accent/10",
            });
        }

        // Add a generic market insight
        insights.push({
            title: "Market Outlook: Neutral",
            desc: "The anticipated Fed rate decisions this quarter suggest maintaining current allocations and looking for value-buy opportunities.",
            icon: <ArrowRight size={20} />,
            color: "text-tab-inactive",
            bg: "bg-foreground/5",
        });

        return insights;
    };

    const insights = generateInsights();

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 pt-8 px-4 font-sans space-y-8">
            <header className="mb-2">
                <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
                <p className="text-tab-inactive text-sm font-medium">Smart analysis on your holdings</p>
            </header>

            <div className="space-y-4">
                {insights.map((insight, idx) => (
                    <div key={idx} className="glass rounded-[1.5rem] p-5 border border-glass-border">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${insight.bg} ${insight.color}`}>
                                {insight.icon}
                            </div>
                            <h3 className="font-bold text-lg">{insight.title}</h3>
                        </div>
                        <p className="text-tab-inactive font-medium text-sm leading-relaxed pl-1">
                            {insight.desc}
                        </p>
                    </div>
                ))}
            </div>

        </div>
    );
}
