import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useProject } from "@/contexts/ProjectContext";
import { calculateCustomScenario } from "@/lib/calculator";
import { formatCurrency, formatPercent, getViabilityStatus } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Sliders } from "lucide-react";

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${highlight ? "text-success" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

export default function CenariosPage() {
  const { scenarios, calcInputs } = useProject();

  const [custom, setCustom] = useState({
    priceVariation: 5,
    constructionCostVariation: 8,
    salesSpeedVariation: 10,
    interestRateVariation: 10,
    defaultRate: 4,
  });

  const customScenario = useMemo(
    () => calculateCustomScenario(calcInputs, custom),
    [calcInputs, custom]
  );

  const allScenarios = [...scenarios, customScenario];

  const comparisonData = allScenarios.map(s => ({
    name: s.name,
    "VPL (M)": +(s.npv / 1e6).toFixed(1),
    "Lucro (M)": +(s.netProfit / 1e6).toFixed(1),
  }));

  const marginData = allScenarios.map(s => ({
    name: s.name,
    "Margem (%)": +(s.netMargin * 100).toFixed(1),
    "TIR (%)": +(s.irr * 100).toFixed(1),
    "ROI (%)": +(s.roi * 100).toFixed(1),
  }));

  const sliders = [
    { key: "priceVariation", label: "Variação de Preço de Venda", min: -30, max: 30, unit: "%" },
    { key: "constructionCostVariation", label: "Variação no Custo de Obra", min: -20, max: 40, unit: "%" },
    { key: "salesSpeedVariation", label: "Variação na Velocidade de Vendas", min: -50, max: 50, unit: "%" },
    { key: "interestRateVariation", label: "Variação na Taxa de Juros", min: -30, max: 50, unit: "%" },
    { key: "defaultRate", label: "Taxa de Distrato", min: 0, max: 20, unit: "%" },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader title="Cenários e Simulações" description="Comparação calculada entre cenários pessimista, base, otimista e personalizado" />

      {/* Cards dos cenários */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {allScenarios.map(s => {
          const v = getViabilityStatus(s.netMargin, s.irr, s.npv);
          const isCustom = s.type === "custom";
          return (
            <div key={s.id} className={`bg-card border rounded-lg p-5 space-y-4 ${isCustom ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-heading font-bold text-foreground">{s.name}</h3>
                <StatusBadge status={v.status} label={v.label} size="sm" />
              </div>
              <div className="space-y-2 text-sm font-body">
                <Row label="VGV" value={formatCurrency(s.vgv)} />
                <Row label="Receita Líquida" value={formatCurrency(s.netRevenue)} />
                <Row label="Custo Total" value={formatCurrency(s.totalCost)} />
                <Row label="Lucro Líquido" value={formatCurrency(s.netProfit)} highlight={s.netProfit > 0} />
                <Row label="Margem Líquida" value={formatPercent(s.netMargin)} highlight={s.netMargin > 0.10} />
                <Row label="TIR" value={formatPercent(s.irr)} highlight={s.irr > 0.12} />
                <Row label="VPL" value={formatCurrency(s.npv)} highlight={s.npv > 0} />
                <Row label="ROI" value={formatPercent(s.roi)} />
                <Row label="Payback" value={s.simplePayback + " meses"} />
                <Row label="Exp. Caixa" value={formatCurrency(s.maxCashExposure)} />
              </div>
              {!isCustom && (
                <div className="pt-3 border-t border-border/50 text-xs text-muted-foreground space-y-1">
                  <p>Preço: {s.priceVariation > 0 ? "+" : ""}{s.priceVariation}% | Vendas: {s.salesSpeedVariation > 0 ? "+" : ""}{s.salesSpeedVariation}%</p>
                  <p>Custo Obra: {s.constructionCostVariation > 0 ? "+" : ""}{s.constructionCostVariation}% | Juros: {s.interestRateVariation > 0 ? "+" : ""}{s.interestRateVariation}%</p>
                  <p>Distrato: {s.defaultRate}%</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Painel do cenário personalizado */}
      <div className="bg-card border border-primary/30 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-5">
          <Sliders className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-heading font-semibold text-foreground">Cenário Personalizado — Ajuste os Sliders</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sliders.map(sl => {
            const val = custom[sl.key];
            const positive = val >= 0;
            return (
              <div key={sl.key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-muted-foreground">{sl.label}</label>
                  <span className={`text-sm font-bold font-heading ${
                    sl.key === "constructionCostVariation" || sl.key === "interestRateVariation" || sl.key === "defaultRate"
                      ? val > 0 ? "text-destructive" : "text-success"
                      : val >= 0 ? "text-success" : "text-destructive"
                  }`}>
                    {val > 0 ? "+" : ""}{val}{sl.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={sl.min}
                  max={sl.max}
                  step={1}
                  value={val}
                  onChange={e => setCustom(prev => ({ ...prev, [sl.key]: Number(e.target.value) }))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-border accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{sl.min}{sl.unit}</span>
                  <span>0</span>
                  <span>{sl.max}{sl.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">VPL e Lucro por Cenário (R$ M)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(235,20%,18%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} unit="M" />
              <Tooltip contentStyle={{ background: "hsl(235,28%,9%)", border: "1px solid hsl(235,20%,18%)", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="VPL (M)" fill="hsl(239,84%,67%)" radius={[4,4,0,0]} />
              <Bar dataKey="Lucro (M)" fill="hsl(142,71%,45%)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Margens e Retornos por Cenário (%)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={marginData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(235,20%,18%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} unit="%" />
              <Tooltip contentStyle={{ background: "hsl(235,28%,9%)", border: "1px solid hsl(235,20%,18%)", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Margem (%)" fill="hsl(239,84%,67%)" radius={[4,4,0,0]} />
              <Bar dataKey="TIR (%)" fill="hsl(38,92%,50%)" radius={[4,4,0,0]} />
              <Bar dataKey="ROI (%)" fill="hsl(199,89%,48%)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
