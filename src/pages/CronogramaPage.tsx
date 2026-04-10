import { PageHeader } from "@/components/PageHeader";
import { cashFlowData, formatCurrency } from "@/data/mockData";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const physicalData = cashFlowData.filter((_, i) => i % 2 === 0).map(cf => ({
  month: cf.label,
  "Progresso Físico (%)": cf.cumulativePhysical,
}));

const financialData = cashFlowData.filter((_, i) => i % 2 === 0).map(cf => ({
  month: cf.label,
  "Desembolso": cf.constructionOutflow + cf.indirectOutflow,
  "Receita": cf.salesInflow,
}));

export default function CronogramaPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Cronograma Físico-Financeiro" description="Evolução integrada da obra, vendas e caixa ao longo do projeto" />

      {/* Physical Progress Curve */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Curva Física Acumulada</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={physicalData}>
            <defs>
              <linearGradient id="gradPhysical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(199,89%,48%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(199,89%,48%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} unit="%" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="Progresso Físico (%)" stroke="hsl(199,89%,48%)" fill="url(#gradPhysical)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Financial Overlay */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Desembolso vs. Receita</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={financialData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} tickFormatter={(v) => (v / 1e6).toFixed(1) + "M"} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Desembolso" stroke="hsl(0,72%,51%)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Receita" stroke="hsl(142,71%,45%)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Timeline markers */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Marcos do Projeto</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[
            { label: "Aquisição", month: "M1", color: "bg-primary" },
            { label: "Lançamento", month: "M6", color: "bg-info" },
            { label: "Início Obra", month: "M8", color: "bg-warning" },
            { label: "Pico de Obra", month: "M22", color: "bg-destructive" },
            { label: "Entrega", month: "M44", color: "bg-success" },
          ].map(m => (
            <div key={m.label} className="flex flex-col items-center gap-2 min-w-[100px]">
              <div className={`w-3 h-3 rounded-full ${m.color}`} />
              <span className="text-xs font-medium text-foreground">{m.label}</span>
              <span className="text-[10px] text-muted-foreground">{m.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
