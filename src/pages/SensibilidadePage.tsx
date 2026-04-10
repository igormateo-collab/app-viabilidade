import { useProject } from "@/contexts/ProjectContext";
import { PageHeader } from "@/components/PageHeader";
import { calculateBreakPoints } from "@/lib/calculator";
import { formatCurrency, formatPercent } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { RefreshCw, Loader2 } from "lucide-react";

export default function SensibilidadePage() {
  const { sensitivity, runSensitivity, sensitivityLoading, indicators, calcInputs } = useProject();

  const breakPoints = calculateBreakPoints(calcInputs, indicators);

  const tornadoData = sensitivity?.tornado.map(d => ({
    name: d.variable,
    value: d.impact / 1e6,
    fill: d.impact > 0 ? "hsl(142,71%,45%)" : "hsl(0,72%,51%)",
  })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Sensibilidade e Risco" description="Análise de sensibilidade, gráfico tornado e Monte Carlo (400 iterações)" />

      {/* Botão de cálculo */}
      <div className="flex items-center gap-4">
        <button
          onClick={runSensitivity}
          disabled={sensitivityLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {sensitivityLoading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Calculando Monte Carlo...</>
            : <><RefreshCw className="h-4 w-4" /> {sensitivity ? "Recalcular" : "Calcular Sensibilidade"}</>
          }
        </button>
        {!sensitivity && !sensitivityLoading && (
          <p className="text-xs text-muted-foreground hidden sm:block">Clique para rodar o Tornado e Monte Carlo com 400 iterações de amostragem</p>
        )}
        {sensitivity && (
          <div className="flex flex-wrap gap-3 sm:gap-6 text-xs text-muted-foreground">
            <span>TIR Mediana: <strong className="text-foreground">{sensitivity.stats.irrMedian.toFixed(1)}%</strong></span>
            <span>IC 90%: <strong className="text-foreground">{sensitivity.stats.irrP10.toFixed(1)}% — {sensitivity.stats.irrP90.toFixed(1)}%</strong></span>
            <span>Prob. TIR &gt; 15%: <strong className="text-success">{sensitivity.stats.probIrrAbove15}%</strong></span>
            <span>Prob. VPL &gt; 0: <strong className="text-success">{sensitivity.stats.probPositiveNPV}%</strong></span>
          </div>
        )}
      </div>

      {sensitivity && (
        <>
          {/* Tornado */}
          <div className="bg-card border border-border rounded-lg p-3 sm:p-5">
            <h3 className="text-sm font-heading font-semibold text-foreground mb-1">Gráfico Tornado — Impacto no VPL (R$ milhões)</h3>
            <p className="text-xs text-muted-foreground mb-3 sm:mb-4">Variação de ±10–20% em cada input. Amplitude = impacto no VPL do projeto base.</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={tornadoData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(220,10%,55%)" }} unit="M" />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => ["R$ " + v.toFixed(1) + "M", "Impacto VPL"]} />
                <Bar dataKey="value" radius={[0,4,4,0]}>
                  {tornadoData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monte Carlo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-card border border-border rounded-lg p-3 sm:p-5">
              <h3 className="text-sm font-heading font-semibold text-foreground mb-3 sm:mb-4">Monte Carlo — Distribuição da TIR</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sensitivity.monteCarloIRR}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" tick={{ fontSize: 9, fill: "hsl(220,10%,55%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} unit="%" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="probability" fill="hsl(43,85%,57%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>Intervalo de confiança 90%: <strong className="text-foreground">{sensitivity.stats.irrP10.toFixed(1)}% — {sensitivity.stats.irrP90.toFixed(1)}%</strong></p>
                <p>Mediana: <strong className="text-foreground">{sensitivity.stats.irrMedian.toFixed(1)}%</strong> | Prob. TIR &gt; 15%: <strong className="text-success">{sensitivity.stats.probIrrAbove15}%</strong></p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-3 sm:p-5">
              <h3 className="text-sm font-heading font-semibold text-foreground mb-3 sm:mb-4">Monte Carlo — Distribuição do VPL</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sensitivity.monteCarloNPV}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" tick={{ fontSize: 9, fill: "hsl(220,10%,55%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(220,10%,55%)" }} unit="%" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="probability" fill="hsl(199,89%,48%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>Intervalo de confiança 90%: <strong className="text-foreground">R$ {sensitivity.stats.npvP10.toFixed(1)}M — R$ {sensitivity.stats.npvP90.toFixed(1)}M</strong></p>
                <p>Mediana: <strong className="text-foreground">R$ {sensitivity.stats.npvMedian.toFixed(1)}M</strong> | Prob. VPL &gt; 0: <strong className="text-success">{sensitivity.stats.probPositiveNPV}%</strong></p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pontos de Ruptura — sempre visíveis */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Pontos de Ruptura — calculados do projeto base</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Preço mínimo de venda", value: "R$ " + breakPoints.minPricePerSqm.toLocaleString("pt-BR") + "/m²", desc: "Preço mínimo por m² para resultado positivo" },
            { label: "Custo máximo suportável", value: formatCurrency(breakPoints.maxTotalCost), desc: "Custo total máximo sem comprometer viabilidade" },
            { label: "Prazo máximo estimado", value: breakPoints.maxMonths + " meses", desc: "Prazo máximo antes de comprometer o fluxo" },
            { label: "Velocidade mínima de vendas", value: breakPoints.minSalesSpeed + " un/mês", desc: "Velocidade mínima para manutenção do caixa" },
          ].map(item => (
            <div key={item.label} className="space-y-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className="text-lg font-heading font-bold text-foreground">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Resumo de risco */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Indicadores de Risco — projeto base</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { label: "DSCR", value: indicators.dscr.toFixed(2) + "x", ok: indicators.dscr >= 1.2, desc: "≥ 1.2x = saudável" },
            { label: "Índice de Lucratividade", value: indicators.profitabilityIndex.toFixed(3), ok: indicators.profitabilityIndex > 1, desc: "> 1.0 = viável" },
            { label: "Exposição / VGV", value: formatPercent(indicators.maxCashExposure / Math.max(1, indicators.vgv)), ok: indicators.maxCashExposure / indicators.vgv < 0.30, desc: "< 30% = controlado" },
            { label: "TIR / TMA", value: (indicators.irr / 0.12).toFixed(2) + "x", ok: indicators.irr > 0.12, desc: "> 1.0 = supera TMA" },
          ].map(r => (
            <div key={r.label} className={`p-3 rounded-md border ${r.ok ? "bg-success/5 border-success/20" : "bg-warning/5 border-warning/20"}`}>
              <p className="text-[11px] text-muted-foreground mb-1">{r.label}</p>
              <p className={`text-lg font-heading font-bold ${r.ok ? "text-success" : "text-warning"}`}>{r.value}</p>
              <p className="text-[10px] text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
