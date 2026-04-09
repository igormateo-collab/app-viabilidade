import { useProject } from "@/contexts/ProjectContext";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { formatCurrency } from "@/data/mockData";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { DollarSign, AlertTriangle } from "lucide-react";

export default function FluxoCaixaPage() {
  const { cashFlowData, indicators } = useProject();

  const chartData = cashFlowData.filter((_, i) => i % 2 === 0).map(cf => {
    const totalIn = cf.salesInflow + cf.financingInflow + cf.equityInflow;
    const totalOut = cf.landOutflow + cf.constructionOutflow + cf.indirectOutflow + cf.commercialOutflow + cf.taxOutflow + cf.financingOutflow;
    return {
      month: cf.label,
      Entradas: totalIn,
      Saídas: -totalOut,
      "Fluxo Líquido": cf.netFlow,
      "Saldo Acumulado": cf.cumulativeFlow,
    };
  });

  const lastFlow = cashFlowData[cashFlowData.length - 1];
  const finalBalance = lastFlow?.cumulativeFlow ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Fluxo de Caixa do Projeto" description="Fluxo mensal completo com entradas, saídas e saldo acumulado — calculado em tempo real" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Resultado Final" value={formatCurrency(finalBalance)} icon={DollarSign} variant={finalBalance >= 0 ? "success" : "danger"} large tooltip="Saldo acumulado ao final do projeto" />
        <KpiCard title="Exposição Máxima" value={formatCurrency(indicators.maxCashExposure)} variant="warning" icon={AlertTriangle} tooltip="Maior saldo negativo acumulado (módulo)" />
        <KpiCard title="Capital Necessário" value={formatCurrency(indicators.capitalNeeded)} tooltip="Capital próprio total necessário" />
        <KpiCard title="Payback" value={indicators.simplePayback + " meses"} tooltip="Mês em que o saldo acumulado volta a zero" />
      </div>

      {/* Saldo Acumulado */}
      <div className="bg-card border border-border rounded-lg p-3 sm:p-5">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-3 sm:mb-4">Saldo Acumulado (R$)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(239,84%,67%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(239,84%,67%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(235,20%,18%)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} tickFormatter={(v) => (v / 1e6).toFixed(0) + "M"} />
            <Tooltip contentStyle={{ background: "hsl(235,28%,9%)", border: "1px solid hsl(235,20%,18%)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
            <ReferenceLine y={0} stroke="hsl(220,10%,55%)" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="Saldo Acumulado" stroke="hsl(239,84%,67%)" fill="url(#gradPos)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Entradas vs Saídas */}
      <div className="bg-card border border-border rounded-lg p-3 sm:p-5">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-3 sm:mb-4">Entradas vs. Saídas Mensais</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(235,20%,18%)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} tickFormatter={(v) => (v / 1e6).toFixed(0) + "M"} />
            <Tooltip contentStyle={{ background: "hsl(235,28%,9%)", border: "1px solid hsl(235,20%,18%)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Entradas" fill="hsl(142,71%,45%)" radius={[2,2,0,0]} />
            <Bar dataKey="Saídas" fill="hsl(0,72%,51%)" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela — primeiros 18 meses */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-heading font-semibold text-foreground">Fluxo de Caixa Mensal — primeiros 18 meses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-body">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Mês","Vendas","Financ.","Equity","Terreno","Obra","Indir.","Líquido","Acumulado"].map(h => (
                  <th key={h} className={`p-2 text-muted-foreground font-medium ${h === "Mês" ? "text-left" : "text-right"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cashFlowData.slice(0, 18).map(cf => (
                <tr key={cf.month} className="border-b border-border/50 hover:bg-accent/30">
                  <td className="p-2 text-foreground font-medium">{cf.label}</td>
                  <td className="p-2 text-right text-success">{cf.salesInflow > 0 ? formatCurrency(cf.salesInflow) : "—"}</td>
                  <td className="p-2 text-right text-info">{cf.financingInflow > 0 ? formatCurrency(cf.financingInflow) : "—"}</td>
                  <td className="p-2 text-right text-foreground">{cf.equityInflow > 0 ? formatCurrency(cf.equityInflow) : "—"}</td>
                  <td className="p-2 text-right text-destructive">{cf.landOutflow > 0 ? formatCurrency(cf.landOutflow) : "—"}</td>
                  <td className="p-2 text-right text-destructive">{cf.constructionOutflow > 0 ? formatCurrency(cf.constructionOutflow) : "—"}</td>
                  <td className="p-2 text-right text-muted-foreground">{formatCurrency(cf.indirectOutflow)}</td>
                  <td className={`p-2 text-right font-medium ${cf.netFlow >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(cf.netFlow)}</td>
                  <td className={`p-2 text-right font-bold ${cf.cumulativeFlow >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(cf.cumulativeFlow)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
