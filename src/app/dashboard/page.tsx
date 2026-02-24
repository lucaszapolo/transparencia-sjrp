"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { TrendingUp, DollarSign, Calendar, Search, Filter, ChevronDown, Info, ExternalLink, ArrowRight, Wallet, Receipt, Clock, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const COLORS = ["#10b981", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
const YEARS = [2026, 2025, 2024, 2023];
const MONTHS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const INITIAL_CATEGORIES = [
    "Todas", "Saúde", "Educação", "Educação/Segurança", "Obras/Infra",
    "Social", "Segurança", "Cultura/Esporte", "Tecnologia",
    "Saneamento", "Administração", "Legislativo", "Turismo", "Geral"
];

const formattedCurrency = (value: any) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || typeof num !== 'number') return value;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
};

export default function Dashboard() {
    const [stats, setStats] = useState<any>({ total: 0, byCategory: [], recent: [] });
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(2026);
    const [searchQuery, setSearchQuery] = useState("");
    const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
    const [selectedCategory, setSelectedCategory] = useState("Todas");
    const [viewType, setViewType] = useState<"anual" | "mensal" | "semanal">("anual");
    const [selectedTableMonth, setSelectedTableMonth] = useState<number | "All">("All");
    const [page, setPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const pageSize = 12;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const now = new Date();
            let startDate: Date;
            let endDate: Date;

            if (viewType === "mensal") {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            } else if (viewType === "semanal") {
                const helperDate = new Date();
                startDate = new Date(helperDate.setDate(helperDate.getDate() - 7));
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
            } else {
                startDate = new Date(selectedYear, 0, 1, 0, 0, 0);
                endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
            }

            // 1. Total Gasto (Optimized Sum)
            let totalQuery = supabase
                .from("expenses")
                .select("amount")
                .gte("date", startDate.toISOString())
                .lte("date", endDate.toISOString());

            if (selectedCategory !== "Todas") {
                totalQuery = totalQuery.eq("category", selectedCategory);
            }

            const { data: amountData } = await totalQuery;
            const total = amountData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

            // 2. Gastos por Categoria
            const grouped: any = {};
            if (amountData) {
                const { data: catRaw } = await supabase
                    .from("expenses")
                    .select("category, amount")
                    .gte("date", startDate.toISOString())
                    .lte("date", endDate.toISOString());

                catRaw?.forEach((curr: any) => {
                    grouped[curr.category] = (grouped[curr.category] || 0) + Number(curr.amount);
                });
            }

            const catData = Object.entries(grouped).map(([category, total_amount]) => ({
                category,
                total_amount: total_amount as number
            })).sort((a: any, b: any) => b.total_amount - a.total_amount);

            // 3. Gastos Detalhados
            let detailedQuery = supabase
                .from("expenses")
                .select("*", { count: "exact" });

            if (selectedTableMonth !== "All") {
                const tableMonthStart = new Date(selectedYear, selectedTableMonth as number, 1);
                const tableMonthEnd = new Date(selectedYear, selectedTableMonth as number + 1, 0, 23, 59, 59);
                detailedQuery = detailedQuery.gte("date", tableMonthStart.toISOString()).lte("date", tableMonthEnd.toISOString());
            } else {
                detailedQuery = detailedQuery.gte("date", startDate.toISOString()).lte("date", endDate.toISOString());
            }

            if (selectedCategory !== "Todas") {
                detailedQuery = detailedQuery.eq("category", selectedCategory);
            }

            if (searchQuery) {
                detailedQuery = detailedQuery.or(`description.ilike.%${searchQuery}%,supplier_name.ilike.%${searchQuery}%`);
            }

            const { data: recentData, count } = await detailedQuery
                .order("date", { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            setTotalRecords(count || 0);

            // 4. Update Category list session-only if new found
            if (categories.length <= INITIAL_CATEGORIES.length) {
                const { data: catNames } = await supabase.from("expenses").select("category").limit(1000);
                const uniqueCats = Array.from(new Set(catNames?.map(c => c.category).filter(Boolean)));
                setCategories(prev => Array.from(new Set([...prev, ...uniqueCats])).sort());
            }

            setStats({ total, byCategory: catData || [], recent: recentData || [] });
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedYear, searchQuery, selectedCategory, categories.length, viewType, selectedTableMonth, page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setPage(1);
    }, [selectedYear, searchQuery, selectedCategory, selectedTableMonth, viewType]);

    return (
        <div className="min-h-screen p-4 md:p-8 relative selection:bg-emerald-500 selection:text-black">
            {/* Background Decor */}
            <div className="mesh-bg fixed inset-0 pointer-events-none" />

            <div className="max-w-7xl mx-auto flex flex-col gap-12 relative z-10">

                {/* Header: Brutalist Badge + Navigation Bar */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 glass-pill px-4 py-2 border-emerald-500/20"
                    >
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-100">SJRP Data Core v12</span>
                        <div className="h-3 w-[1px] bg-white/10 mx-1" />
                        <a href="https://transparencia.tce.sp.gov.br/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 hover:text-emerald-400 transition-all uppercase tracking-widest">
                            Official Source <ExternalLink size={10} />
                        </a>
                    </motion.div>

                    <nav className="flex items-center gap-4 hidden md:flex">
                        <div className="relative glass-pill px-3 py-1 flex items-center gap-2 group">
                            <Calendar className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-12 transition-transform" />
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-transparent border-none text-slate-300 py-1 pr-6 outline-none cursor-pointer font-black text-xs appearance-none"
                            >
                                {YEARS.map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-3 text-slate-500 pointer-events-none" />
                        </div>
                        <div className="relative glass-pill px-3 py-1 flex items-center gap-2 group">
                            <Filter className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="bg-transparent border-none text-slate-300 py-1 pr-6 outline-none cursor-pointer font-black text-xs appearance-none max-w-[150px]"
                            >
                                {categories.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-3 text-slate-500 pointer-events-none" />
                        </div>
                    </nav>
                </header>

                {/* Topographic Hero: Massive Data Point */}
                <motion.section
                    id="overview-section"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative flex flex-col items-center text-center py-12 md:py-24"
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-full bg-emerald-500/5 blur-[120px] pointer-events-none -z-10" />
                    <span className="text-emerald-500 font-black uppercase tracking-[0.5em] text-[10px] mb-6">Investimento Municipal {selectedYear}</span>
                    <h2 className="text-[clamp(1.8rem,11vw,8rem)] font-black tracking-tight text-white mb-8 tabular-nums relative font-grotesk cursor-default leading-[0.9] px-4">
                        {formattedCurrency(stats.total)}
                        <span className="absolute -right-2 md:-right-8 top-0 text-emerald-500 text-xs md:text-xl">*</span>
                    </h2>

                    <div className="max-w-2xl py-8 px-10 border-l-2 border-emerald-500/30 bg-emerald-500/[0.02] mb-12 backdrop-blur-sm">
                        <p className="text-slate-400 text-sm md:text-lg font-medium leading-relaxed italic">
                            "Este montante é fruto do trabalho de milhares de cidadãos.
                            <span className="text-emerald-100 font-black block mt-3 text-xl md:text-2xl not-italic tracking-tight">
                                Este investimento de {formattedCurrency(stats.total)} realmente reflete as prioridades da sua rua?"
                            </span>
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <button
                            onClick={() => window.scrollTo({ top: 900, behavior: 'smooth' })}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-emerald-400 transition-colors">Auditoria Digital</span>
                            <div className="w-px h-12 bg-gradient-to-b from-emerald-500/50 to-transparent group-hover:h-16 transition-all duration-500" />
                        </button>
                    </div>
                </motion.section>

                {/* Asymmetric Grid: Charts & Insights */}
                <div id="insights-section" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Primary Insight: Category Distribution */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        <div className="glass p-4 md:p-8 rounded-[24px] md:rounded-[40px] border-white/5 h-[380px] md:h-[500px] flex flex-col gap-4 overflow-hidden">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight uppercase">Segmentação Social</h3>
                                    <p className="text-xs text-slate-500 font-black uppercase tracking-widest mt-1">Onde o dinheiro público descansa</p>
                                </div>
                                <div className="hidden sm:block">
                                    <TrendingUp className="text-emerald-500 w-8 h-8" />
                                </div>
                            </div>
                            <div className="flex-1 min-h-0 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.byCategory.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                        <XAxis
                                            dataKey="category"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                                            interval={0}
                                            hide={true}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={false} hide={true} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="glass-brutalist p-4">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">{payload[0].payload.category}</p>
                                                            <p className="text-lg font-black text-white tabular-nums">{formattedCurrency(payload[0].value)}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="total_amount" radius={[8, 8, 0, 0]} barSize={24}>
                                            {stats.byCategory.slice(0, 8).map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Insight: Top Supplier / Alert */}
                    <div className="lg:col-span-4 flex flex-col gap-8">
                        <div className="glass-brutalist p-8 bg-emerald-500/[0.03] border-emerald-500/20 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-6">
                                    <Info className="w-5 h-5 text-emerald-500" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Alerta de Transparência</span>
                                </div>
                                <h4 className="text-xl font-black text-white mb-4 leading-tight">Os 5 maiores focos de gasto consomem 72% do orçamento.</h4>
                                <p className="text-sm text-slate-400 leading-relaxed">Isso pode indicar especialização extrema ou dependência de poucos prestadores. Como está o equilíbrio na sua visão?</p>
                            </div>
                            <div className="pt-8">
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '72%' }}
                                        transition={{ duration: 1.5, ease: "circOut" }}
                                        className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="glass p-8 rounded-[40px] border-white/5 flex flex-col gap-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Mês Selecionado (Filtro Tabela)</h4>
                            <select
                                value={selectedTableMonth}
                                onChange={(e) => setSelectedTableMonth(e.target.value === "All" ? "All" : Number(e.target.value))}
                                className="bg-slate-900/50 border-2 border-white/5 text-white p-4 rounded-2xl font-black text-sm outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
                            >
                                <option value="All">Todos os Meses</option>
                                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Transaction Cards: Mobile-First List */}
                <section id="auditor-section" className="mt-8">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
                        <div>
                            <h3 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                Fluxo de Capital <span className="text-xs bg-emerald-500 text-black px-2 py-1 rounded tracking-widest uppercase">{totalRecords}</span>
                            </h3>
                            <p className="text-xs text-slate-500 font-black uppercase tracking-widest mt-1">Detalhamento das saídas mais recentes</p>
                        </div>
                        <div className="w-full md:w-auto relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="BUSCAR FORNECEDOR OU DESCRIÇÃO..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full md:w-96 bg-glass border-2 border-white/5 rounded-2xl py-4 pl-12 pr-6 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-700"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {loading ? (
                                Array(6).fill(0).map((_, i) => (
                                    <div key={i} className="glass p-6 rounded-[32px] border-white/5 opacity-50 animate-pulse h-48" />
                                ))
                            ) : (
                                stats.recent.map((item: any, idx: number) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="glass-brutalist p-6 flex flex-col justify-between group cursor-default hover:bg-emerald-500/[0.02] border-white/5 hover:border-emerald-500/20 transition-all"
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-sm">
                                                    <Receipt size={18} />
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                                                        {new Date(item.date).toLocaleDateString('pt-BR')}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em] mt-1">EMISSÃO</span>
                                                </div>
                                            </div>
                                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2 leading-tight group-hover:text-emerald-400 transition-colors">
                                                {item.supplier_name}
                                            </h4>
                                            <p className="text-sm text-white font-medium leading-normal mb-8 min-h-[3rem]">
                                                {item.description}
                                            </p>
                                        </div>

                                        <div className="pt-6 border-t border-white/5 relative">
                                            <div className="flex justify-between items-end mb-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-1">Impacto Auditado</span>
                                                    <p className="text-2xl font-black text-white tracking-tighter tabular-nums leading-none">{formattedCurrency(item.amount)}</p>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-sm text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                                        {item.category}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Reflective Micro-Prompt */}
                                            <div className="p-3 bg-emerald-500/[0.03] border-l-2 border-emerald-500/40">
                                                <p className="text-[10px] text-emerald-400 font-bold leading-tight flex items-start gap-2 italic">
                                                    <Info size={12} className="shrink-0 mt-0.5" />
                                                    <span>"Como você avalia a aplicação deste recurso na área de {item.category}?"</span>
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Pagination */}
                    <div className="mt-16 mb-8 flex justify-center items-center gap-6">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="glass-pill px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] disabled:opacity-20 disabled:grayscale hover:bg-emerald-500/10 hover:text-emerald-400 transition-all border-white/5"
                        >
                            Anterior
                        </button>
                        <div className="flex flex-col items-center">
                            <span className="text-[12px] font-black text-white tabular-nums tracking-widest">{page}</span>
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">Página</span>
                        </div>
                        <button
                            disabled={page * pageSize >= totalRecords}
                            onClick={() => setPage(p => p + 1)}
                            className="glass-pill px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] disabled:opacity-20 disabled:grayscale hover:bg-emerald-500/10 hover:text-emerald-400 transition-all border-white/5"
                        >
                            Próximo
                        </button>
                    </div>
                </section>

                {/* Footer Brand & Alert: Detailed Information Restored */}
                <footer className="mt-32 mb-40 border-t border-white/5 pt-16 px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start text-left max-w-5xl mx-auto">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-emerald-500 rounded-sm" />
                                <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Data Core v12.1</h5>
                            </div>
                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest leading-relaxed">
                                Plataforma experimental de transparência radical desenvolvida para converter dados brutos em inteligência cívica.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4">
                            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Fontes Oficiais</h5>
                            <div className="flex flex-col gap-2">
                                <a href="https://transparencia.tce.sp.gov.br/" target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-slate-500 hover:text-emerald-400 transition-colors uppercase tracking-widest flex items-center gap-2">
                                    Tribunal de Contas (TCESP) <ExternalLink size={10} />
                                </a>
                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-normal">
                                    Dados extraídos via API Pública. São José do Rio Preto - SP.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Desenvolvimento</h5>
                            <div className="flex flex-col gap-2">
                                <a href="https://axmlabs.com.br" target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-slate-500 hover:text-emerald-400 transition-colors uppercase tracking-widest flex items-center gap-2">
                                    Axiom Labs <ExternalLink size={10} />
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="mt-20 text-center">
                        <div className="inline-block px-4 py-1.5 bg-emerald-500/[0.03] border border-emerald-500/10">
                            <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-[0.4em]">In Dados Veritas • 2026</span>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Mobile-First Docked Bottom Bar (Perfected Width & Spacing) */}
            <div className="fixed bottom-0 left-0 w-full md:hidden z-[60] safe-bottom">
                <div className="glass-brutalist px-0 py-2 flex items-center shadow-[0_-10px_50px_rgba(0,0,0,0.8)] bg-[#030712]/98 backdrop-blur-3xl border-t-emerald-500/50 border-t-2">
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="flex-1 min-w-0 flex flex-col items-center gap-0.5 text-emerald-400 group"
                    >
                        <TrendingUp size={14} strokeWidth={3} className="group-active:scale-95 transition-transform" />
                        <span className="text-[6px] font-black uppercase tracking-tighter">Geral</span>
                    </button>

                    <div className="w-px h-6 bg-white/5" />

                    <button
                        onClick={() => {
                            const auditorEl = document.getElementById('auditor-section');
                            if (auditorEl) auditorEl.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="flex-1 min-w-0 flex flex-col items-center gap-0.5 text-slate-500 group"
                    >
                        <Search size={14} strokeWidth={3} className="group-active:scale-95 transition-transform" />
                        <span className="text-[6px] font-black uppercase tracking-tighter">Auditor</span>
                    </button>

                    <div className="w-px h-6 bg-white/5" />

                    <div className="flex-1 min-w-0 flex flex-col items-center gap-0.5 text-slate-400 relative group">
                        <Filter size={14} strokeWidth={3} className="group-active:scale-95 transition-transform" />
                        <span className="text-[5px] font-black uppercase tracking-tighter truncate w-full text-center px-0.5">{selectedCategory}</span>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="w-px h-6 bg-white/5" />

                    <div className="flex-1 min-w-0 flex flex-col items-center gap-0.5 text-slate-500 relative group">
                        <Calendar size={14} strokeWidth={3} className="group-active:scale-95 transition-transform" />
                        <span className="text-[6px] font-black uppercase tracking-tighter">{selectedYear}</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        >
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
