import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { useProject } from "@/contexts/ProjectContext";
import { formatCurrency, formatPercent, getViabilityStatus } from "@/data/mockData";
import { DollarSign, TrendingUp, Percent, Clock, BarChart3, AlertTriangle, Building2 } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { motion } from "framer-motion";

const COLORS = ["hsl(43,85%,57%)", "hsl(199,89%,48%)", "hsl(142,71%,45%)", "hsl(38,92%,50%)", "hsl(0,72%,51%)", "hsl(280,65%,60%)"];
const fadeIn = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

export default function Dashboard() {
  const { indicators, cashFlowData, scenarios, unitTypes, costCategories, enterprise } = useProject();
  const viability = getViabilityStatus(indicators.netMargin, indicators.irr, indicators.npv);

  // Alertas dinâmicos
  const alerts: { type: "success" | "warning" | "danger"; message: string }[] = [];
  if (indicators.netMargin > 0.18) alerts.push({ type: "success", message: "Margem líquida robusta — projeto altamente rentável" });
  if (indicators.irr > 0.20) alerts.push({ type: "success", message: "TIR de " + formatPercent(indicators.irr) + " supera a TMA padrão de mercado" });
  if (indicators.netMargin < 0.08 && indicators.netMargin > 0) alerts.push({ type: "warning", message: "Margem líquida abaixo de 8% — revisar premissas" });
  if (indicators.netProfit < 0) alerts.push({ type: "danger", message: "Projeto inviável no cenário base — lucro negativo" });
  if (indicators.maxCashExposure > 35000000) alerts.push({ type: "warning", message: "Exposição máxima de caixa elevada: " + formatCurrency(indicators.maxCashExposure) });
  if (indicators.simplePayback > 36) alerts.push({ type: "warning", message: "Payback de " + indicators.simplePayback + " meses — prazo estendido" });

  // Gráfico de fluxo de caixa
  const cashFlowChart = cashFlowData
    .filter((_, i) => i % 2 === 0 || i === cashFlowData.length - 1)
    .map(cf => ({
      month: cf.label,
      "Entradas": cf.salesInflow + cf.financingInflow + cf.equityInflow,
      "Saídas": -(cf.landOutflow + cf.constructionOutflow + cf.indirectOutflow + cf.commercialOutflow + cf.taxOutflow + cf.financingOutflow),
      "Saldo Acumulado": cf.cumulativeFlow,
    }));

  // Composição de custos
  const costGroups = costCategories.reduce((acc, c) => {
    acc[c.group] = (acc[c.group] || 0) + c.budgetValue;
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(costGroups).map(([name, value]) => ({ name, value }));

  // Comparação de cenários
  const scenarioComparison = scenarios.map(s => ({
    name: s.name,
    "Margem Líq.": +(s.netMargin * 100).toFixed(1),
    "TIR": +(s.irr * 100).toFixed(1),
    "ROI": +(s.roi * 100).toFixed(1),
  }));

  // VGV por tipologia
  const vgvByType = unitTypes.map(ut => ({
    name: ut.name,
    value: ut.quantity * ut.unitPrice,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Executivo" description={enterprise.name + " — " + enterprise.neighborhood + ", " + enterprise.city}>
        <StatusBadge status={viability.status} label={viability.label} size="lg" />
      </PageHeader>

      {/* Alertas */}
      {alerts.length > 0 && (
        <motion.div {...fadeIn} className="flex flex-wrap gap-2">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-body ${
              a.type === "success" ? "bg-success/10 text-success border border-success/20" :
              a.type === "warning" ? "bg-warning/10 text-warning border border-warning/20" :
              "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              {a.type !== "success" ? <AlertTriangle className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
              {a.message}
            </div>
          ))}
        </motion.div>
      )}

      {/* KPIs — Row 1 */}
      <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
        <KpiCard title="VGV" value={formatCurrency(indicators.vgv)} icon={Building2} variant="primary" large tooltip="Valor Geral de Vendas — soma do valor potencial de todas as unidades" className="col-span-2" />
        <KpiCard title="Receita Líquida" value={formatCurrency(indicators.netRevenue)} icon={DollarSign} tooltip="Receita bruta menos descontos, distratos, impostos e inadimplência" />
        <KpiCard title="Custo Total" value={formatCurrency(indicators.totalCost)} icon={BarChart3} tooltip="Terreno + construção + indiretos + comercial + tributos + financeiro" />
        <KpiCard title="Lucro Líquido" value={formatCurrency(indicators.netProfit)} variant={indicators.netProfit >= 0 ? "success" : "danger"} icon={TrendingUp} tooltip="Receita líquida menos todos os custos" />
        <KpiCard title="Margem Líquida" value={formatPercent(indicators.netMargin)} variant={indicators.netMargin >= 0.12 ? "success" : "warning"} icon={Percent} tooltip="Lucro líquido / Receita líquida" />
      </motion.div>

      {/* KPIs — Row 2 */}
      <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
        <KpiCard title="TIR" value={formatPercent(indicators.irr)} variant={indicators.irr >= 0.12 ? "success" : "warning"} tooltip="Taxa Interna de Retorno do projeto" />
        <KpiCard title="TIR Alavancada" value={formatPercent(indicators.leveragedIrr)} variant="primary" tooltip="TIR na perspectiva do capital próprio com alavancagem" />
        <KpiCard title="VPL" value={formatCurrency(indicators.npv)} variant={indicators.npv >= 0 ? "success" : "danger"} tooltip="Valor Presente Líquido com TMA de 12% a.a." />
        <KpiCard title="ROI" value={formatPercent(indicators.roi)} tooltip="Lucro líquido / Capital total investido" />
        <KpiCard title="Payback" value={indicators.simplePayback + " meses"} icon={Clock} tooltip="Meses para recuperar o capital investido" />
        <KpiCard title="Exposição Máx." value={formatCurrency(indicators.maxCashExposure)} variant="warning" icon={AlertTriangle} tooltip="Maior saldo acumulado negativo (módulo)" />
      </motion.div>

      {/* KPIs — Row 3 */}
      <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
        <KpiCard title="Margem Bruta" value={formatPercent(indicators.grossMargin)} tooltip="Lucro bruto / Receita líquida" />
        <KpiCard title="ROE" value={formatPercent(indicators.roe)} tooltip="Lucro líquido / Capital próprio" />
        <KpiCard title="Capital Necessário" value={formatCurrency(indicators.capitalNeeded)} tooltip="Capital próprio necessário para o projeto" />
        <KpiCard title="Custo/m²" value={"R$ " + indicators.costPerSqm.toLocaleString("pt-BR")} tooltip="Custo total / Área privativa" />
        <KpiCard title="Lucro/m²" value={"R$ " + indicators.profitPerSqm.toLocaleString("pt-BR")} tooltip="Lucro líquido / Área privativa" />
        <KpiCard title="Ticket Médio" value={formatCurrency(indicators.avgTicket)} tooltip="VGV / Unidades vendáveis" />
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Fluxo de Caixa */}
        <motion.div {...fadeIn} transition={{ delay: 0.25 }} className="bg-card border border-border rounded-lg p-3 sm:p-5">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-3 sm:mb-4">Fluxo de Caixa — Saldo Acumulado</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cashFlowChart}>
              <defs>
                <linearGradient id="gradCash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(43,85%,57%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(43,85%,57%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "hsl(220,10%,55%)" }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: "hsl(220,10%,55%)" }} tickFormatter={(v) => (v / 1e6).toFixed(0) + "M"} width={32} />
              <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="Saldo Acumulado" stroke="hsl(43,85%,57%)" fill="url(#gradCash)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Composição de Custos */}
        <motion.div {...fadeIn} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-lg p-3 sm:p-5">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-3 sm:mb-4">Composição de Custos por Grupo</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Comparação de Cenários */}
        <motion.div {...fadeIn} transition={{ delay: 0.35 }} className="bg-card border border-border rounded-lg p-3 sm:p-5">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-3 sm:mb-4">Comparação de Cenários (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scenarioComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(220,10%,55%)" }} unit="%" width={28} />
              <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Margem Líq." fill="hsl(43,85%,57%)" radius={[4,4,0,0]} />
              <Bar dataKey="TIR" fill="hsl(38,92%,50%)" radius={[4,4,0,0]} />
              <Bar dataKey="ROI" fill="hsl(142,71%,45%)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* VGV por tipologia */}
        <motion.div {...fadeIn} transition={{ delay: 0.4 }} className="bg-card border border-border rounded-lg p-3 sm:p-5">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-3 sm:mb-4">VGV por Tipologia</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={vgvByType} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(220,10%,55%)" }} tickFormatter={(v) => (v / 1e6).toFixed(0) + "M"} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9, fill: "hsl(220,10%,55%)" }} />
              <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="value" fill="hsl(199,89%,48%)" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
