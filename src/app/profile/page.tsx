"use client";

import { Download, UploadCloud, FileJson } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioContext";
import { useState } from "react";

export default function Profile() {
    const { trades, watchlist, currency, importData } = usePortfolio();
    const [dragActive, setDragActive] = useState(false);
    const [importStatus, setImportStatus] = useState<string | null>(null);

    const handleExport = () => {
        const data = {
            trades,
            watchlist,
            currency
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `myquant-backup-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                const success = importData(json);
                if (success) {
                    setImportStatus("Data successfully restored!");
                    setTimeout(() => setImportStatus(null), 3000);
                } else {
                    setImportStatus("Invalid backup file structure.");
                }
            } catch (err) {
                setImportStatus("Failed to read JSON file.");
            }
        };
        reader.readAsText(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 pt-8 px-4 font-sans space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-tab-inactive text-sm font-medium">Manage your data locally</p>
            </header>

            {/* Export Section */}
            <section className="glass rounded-3xl p-6 shadow-lg border border-glass-border">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                        <Download size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Export Backup</h2>
                        <p className="text-xs text-tab-inactive font-medium">Download your portfolio state</p>
                    </div>
                </div>
                <button
                    onClick={handleExport}
                    className="w-full bg-foreground text-background py-3 rounded-xl font-bold text-sm shadow-md active:scale-[0.98] transition-transform"
                >
                    Save as JSON
                </button>
            </section>

            {/* Import Section */}
            <section className="glass rounded-3xl p-6 shadow-lg border border-glass-border relative">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#34C759]/20 flex items-center justify-center text-[#34C759]">
                        <UploadCloud size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Restore Data</h2>
                        <p className="text-xs text-tab-inactive font-medium">Import a previous backup</p>
                    </div>
                </div>
                <div
                    className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-colors ${dragActive ? 'border-accent bg-accent/10' : 'border-glass-border bg-white/5'}`}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                    onDrop={handleDrop}
                >
                    <input type="file" accept=".json" onChange={handleFileInput} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <FileJson size={32} className="text-tab-inactive mb-2" />
                    <p className="text-sm font-semibold text-center mb-1">Drag & Drop backup here</p>
                    <p className="text-xs text-tab-inactive text-center font-medium">or tap to select file</p>
                </div>
                {importStatus && (
                    <p className={`mt-4 text-sm font-bold text-center ${importStatus.includes("successfully") ? "text-[#34C759]" : "text-red-500"}`}>{importStatus}</p>
                )}
            </section>
        </div>
    );
}
