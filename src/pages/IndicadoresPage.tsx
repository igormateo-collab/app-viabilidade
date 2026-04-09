import { useProject } from "@/contexts/ProjectContext";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatPercent, getViabilityStatus } from "@/data/mockData";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export default function IndicadoresPage() {
  const { indicators } = useProject();
  const viability = getViabilityStatus(indicators.netMargin, indicators.irr, indicators.npv);

  const allIndicators = [
    { name: "VGV", value: formatCurrency(indicators.vgv), formula: "Σ (Qtde_tipologia × Preço_tipologia)", category: "Receita" },
    { name: "Receita Bruta", value: formatCurrency(indicators.grossRevenue), formula: "VGV − valor das unidades em permuta", category: "Receita" },
    { name: "Receita Líquida", value: formatCurrency(indicators.netRevenue), formula: "Rec. Bruta × (1 − distrato% − inadimpl.%) − tributos sobre receita", category: "Receita" },
    { name: "Custo Total", value: formatCurrency(indicators.totalCost), formula: "Terreno + Obra + Indiretos + Comercial + Tributos + Financeiro", category: "Custo" },
    { name: "Custo do Terreno", value: formatCurrency(indicators.landCost), formula: "Valor do terreno (sem custos de aquisição)", category: "Custo" },
    { name: "Custo de Aquisição", value: formatCurrency(indicators.acquisitionCost), formula: "Terreno + ITBI + cartório + jurídico + licenças + due diligence", category: "Custo" },
    { name: "Custo de Construção", value: formatCurrency(indicators.constructionCost), formula: "Σ todas as categorias de custo (incl. contingência)", category: "Custo" },
    { name: "Despesas Indiretas", value: formatCurrency(indicators.indirectExpenses), formula: "Admin + equipe + jurídico + marketing + overhead corporativo", category: "Custo" },
    { name: "Despesas Comerciais", value: formatCurrency(indicators.commercialExpenses), formula: "Comissão de vendas (%) × Receita Bruta", category: "Custo" },
    { name: "Tributos sobre Receita", value: formatCurrency(indicators.taxes), formula: "Receita Bruta × alíquota efetiva (RET ou regime normal)", category: "Custo" },
    { name: "Custo Financeiro", value: formatCurrency(indicators.financialCost), formula: "Juros + IOF + TAC do financiamento à produção", category: "Custo" },
    { name: "Contingência", value: formatCurrency(indicators.contingency), formula: "Σ categorias de custo do grupo 'Contingência'", category: "Custo" },
    { name: "Lucro Bruto", value: formatCurrency(indicators.grossProfit), formula: "Receita Líquida − custos operacionais principais (sem financeiro)", category: "Resultado" },
    { name: "Lucro Líquido", value: formatCurrency(indicators.netProfit), formula: "Receita Líquida − Custo Total", category: "Resultado" },
    { name: "Margem Bruta", value: formatPercent(indicators.grossMargin), formula: "Lucro Bruto / Receita Líquida", category: "Resultado" },
    { name: "Margem Líquida", value: formatPercent(indicators.netMargin), formula: "Lucro Líquido / Receita Líquida", category: "Resultado" },
    { name: "Markup", value: formatPercent(indicators.markup), formula: "Lucro Líquido / Custo Total", category: "Resultado" },
    { name: "TIR", value: formatPercent(indicators.irr), formula: "Taxa que zera o VPL do fluxo de caixa mensal (bisseção sobre 300+ iterações)", category: "Retorno" },
    { name: "TIR Alavancada", value: formatPercent(indicators.leveragedIrr), formula: "IRR do fluxo de caixa do capital próprio (vendas − todos os custos − serviço da dívida)", category: "Retorno" },
    { name: "VPL", value: formatCurrency(indicators.npv), formula: "Σ [FC_t / (1 + TMA)^t] — TMA extraída das configurações", category: "Retorno" },
    { name: "ROI", value: formatPercent(indicators.roi), formula: "Lucro Líquido / Custo Total", category: "Retorno" },
    { name: "ROE", value: formatPercent(indicators.roe), formula: "Lucro Líquido / Capital Próprio", category: "Retorno" },
    { name: "Payback Simples", value: indicators.simplePayback + " meses", formula: "Primeiro mês com saldo acumulado ≥ 0", category: "Retorno" },
    { name: "Payback Descontado", value: indicators.discountedPayback + " meses", formula: "Primeiro mês com saldo acumulado descontado (TMA) ≥ 0", category: "Retorno" },
    { name: "Índice de Lucratividade", value: indicators.profitabilityIndex.toFixed(3), formula: "VP das Entradas / VP das Saídas (descontado pela TMA)", category: "Retorno" },
    { name: "DSCR", value: indicators.dscr.toFixed(2) + "x", formula: "Geração de caixa operacional / Serviço da dívida total", category: "Risco" },
    { name: "Exposição Máx. de Caixa", value: formatCurrency(indicators.maxCashExposure), formula: "Módulo do pico negativo do saldo acumulado", category: "Risco" },
    { name: "Capital Necessário", value: formatCurrency(indicators.capitalNeeded), formula: "Capital próprio total parametrizado em Funding", category: "Risco" },
    { name: "Break-even (unidades)", value: indicators.breakEvenPoint + " un.", formula: "Custo Total / (VGV / Unidades vendáveis)", category: "Risco" },
    { name: "Custo/m²", value: "R$ " + indicators.costPerSqm.toLocaleString("pt-BR"), formula: "Custo Total / Área privativa vendável", category: "Unitário" },
    { name: "Lucro/m²", value: "R$ " + indicators.profitPerSqm.toLocaleString("pt-BR"), formula: "Lucro Líquido / Área privativa vendável", category: "Unitário" },
    { name: "Ticket Médio", value: formatCurrency(indicators.avgTicket), formula: "VGV / Total de unidades vendáveis (qty − permuta − bloqueio)", category: "Unitário" },
  ];

  const categories = [...new Set(allIndicators.map(i => i.category))];

  return (
    <div className="space-y-6">
      <PageHeader title="Indicadores de Viabilidade" description="Todos os indicadores calculados em tempo real com memória de cálculo">
        <StatusBadge status={viability.status} label={viability.label} size="lg" />
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-success/70 mb-1">TIR</p>
          <p className="text-xl font-heading font-bold text-success">{formatPercent(indicators.irr)}</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-primary/70 mb-1">VPL</p>
          <p className="text-xl font-heading font-bold text-primary">{formatCurrency(indicators.npv)}</p>
        </div>
        <div className={`${indicators.netMargin >= 0.12 ? "bg-success/10 border-success/20" : "bg-warning/10 border-warning/20"} border rounded-lg p-3 text-center`}>
          <p className={`text-[10px] uppercase tracking-wider mb-1 ${indicators.netMargin >= 0.12 ? "text-success/70" : "text-warning/70"}`}>Margem</p>
          <p className={`text-xl font-heading font-bold ${indicators.netMargin >= 0.12 ? "text-success" : "text-warning"}`}>{formatPercent(indicators.netMargin)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Payback</p>
          <p className="text-xl font-heading font-bold text-foreground">{indicators.simplePayback} m</p>
        </div>
      </div>

      {categories.map(cat => (
        <div key={cat} className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20">
            <h3 className="text-sm font-heading font-semibold text-foreground">{cat}</h3>
          </div>
          <div className="divide-y divide-border/50">
            {allIndicators.filter(i => i.category === cat).map(ind => (
              <div key={ind.name} className="flex items-center justify-between px-4 py-3 hover:bg-accent/20 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{ind.name}</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-sm text-xs">
                      <strong>Fórmula:</strong> {ind.formula}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="text-sm font-bold text-foreground">{ind.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
