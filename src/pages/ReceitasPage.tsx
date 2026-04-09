import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { indicators, cashFlowData, formatCurrency, formatPercent } from "@/data/mockData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

// Aggregate sales inflow as revenue curve
const revenueData = cashFlowData.filter((_, i) => i % 2 === 0).map(cf => ({
  month: cf.label,
  "Receita Mensal": cf.salesInflow,
  "Progresso Vendas": Math.round(cf.cumulativePhysical),
}));

export default function ReceitasPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Receitas e Vendas" description="Projeção comercial, curva de vendas e receita projetada" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="VGV" value={formatCurrency(indicators.vgv)} icon={TrendingUp} variant="primary" large tooltip="Valor Geral de Vendas" />
        <KpiCard title="Receita Bruta" value={formatCurrency(indicators.grossRevenue)} tooltip="Receita projetada de vendas" />
        <KpiCard title="Receita Líquida" value={formatCurrency(indicators.netRevenue)} tooltip="Receita bruta menos deduções" />
        <KpiCard title="Ticket Médio" value={formatCurrency(indicators.avgTicket)} tooltip="Preço médio por unidade" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Velocidade Média" value={indicators.avgSalesSpeed + " un/mês"} tooltip="Unidades vendidas por mês" />
        <KpiCard title="Comissão Estimada" value={formatCurrency(indicators.commercialExpenses)} tooltip="Custo total de comissões e despesas comerciais" />
        <KpiCard title="Distrato Estimado" value="3%" variant="warning" tooltip="Percentual de distratos sobre vendas" />
        <KpiCard title="Inadimplência" value="2%" tooltip="Percentual de inadimplência projetada" />
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Curva de Receita Mensal</h3>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142,71%,45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142,71%,45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(235,20%,18%)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} tickFormatter={(v) => (v / 1e6).toFixed(1) + "M"} />
            <Tooltip contentStyle={{ background: "hsl(235,28%,9%)", border: "1px solid hsl(235,20%,18%)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
            <Area type="monotone" dataKey="Receita Mensal" stroke="hsl(142,71%,45%)" fill="url(#gradRevenue)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
