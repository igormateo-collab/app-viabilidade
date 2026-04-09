import { useProject } from "@/contexts/ProjectContext";
import { PageHeader } from "@/components/PageHeader";
import { formatCurrency, formatPercent } from "@/data/mockData";
import { CheckCircle, AlertCircle, Info } from "lucide-react";

function Linha({ label, valor, formula, ok }: { label: string; valor: string; formula: string; ok?: boolean }) {
  return (
    <div className="grid grid-cols-12 gap-2 py-2.5 border-b border-border/40 hover:bg-accent/10 px-2 rounded text-xs">
      <div className="col-span-3 font-medium text-foreground flex items-center gap-1.5">
        {ok !== undefined && (
          ok ? <CheckCircle className="h-3.5 w-3.5 text-success flex-shrink-0" />
             : <AlertCircle className="h-3.5 w-3.5 text-warning flex-shrink-0" />
        )}
        {label}
      </div>
      <div className="col-span-3 font-bold text-foreground">{valor}</div>
      <div className="col-span-6 text-muted-foreground font-mono">{formula}</div>
    </div>
  );
}

function Secao({ titulo }: { titulo: string }) {
  return (
    <div className="grid grid-cols-12 gap-2 py-2 px-2">
      <div className="col-span-12 text-[10px] uppercase tracking-widest font-semibold text-primary/80 mt-2">{titulo}</div>
    </div>
  );
}

export default function AuditoriaPage() {
  const { indicators, cashFlowData, settings, unitTypes, costCategories, land, expenses, fund } = useProject();

  const totalUnidades = unitTypes.reduce((s, u) => s + u.quantity, 0);
  const unidadesPermuta = unitTypes.reduce((s, u) => s + u.swappedUnits, 0);
  const unidadesVendaveis = unitTypes.reduce((s, u) => s + Math.max(0, u.quantity - u.swappedUnits - u.blockedUnits), 0);
  const areaPrivativa = unitTypes.reduce((s, u) => s + (u.quantity - u.swappedUnits) * u.privateArea, 0);
  const parsePct = (s: string) => { const m = s.replace(",", ".").match(/([\d.]+)/); return m ? parseFloat(m[0]) / 100 : 0; };
  const distratoR = parsePct(settings.defaultDistrato);
  const inadimR = parsePct(settings.defaultInadimplencia);
  const commR = parsePct(settings.salesCommission);
  const tmaR = parsePct(settings.tma);
  const taxR = 0.04; // RET

  const peakNeg = cashFlowData.reduce((min, cf) => Math.min(min, cf.cumulativeFlow), 0);
  const finalBalance = cashFlowData[cashFlowData.length - 1]?.cumulativeFlow ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Trilha de Auditoria" description="Memória de cálculo completa — cada indicador com sua fórmula e derivação" />

      <div className="bg-accent/20 border border-primary/20 rounded-lg p-3 flex items-start gap-2 text-xs text-primary">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>Todos os valores abaixo são calculados em tempo real a partir do estado atual do projeto. Altere qualquer campo e esta tela se atualiza automaticamente.</span>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground px-2">
            <div className="col-span-3">Indicador</div>
            <div className="col-span-3">Valor</div>
            <div className="col-span-6">Fórmula / Memória de Cálculo</div>
          </div>
        </div>

        <div className="p-2">
          <Secao titulo="1 — Produto" />
          <Linha label="Total de unidades" valor={totalUnidades + " un."} formula={`Σ unitTypes.quantity = ${unitTypes.map(u => u.quantity).join(" + ")} = ${totalUnidades}`} />
          <Linha label="Unidades em permuta" valor={unidadesPermuta + " un."} formula={`Σ unitTypes.swappedUnits = ${unitTypes.map(u => u.swappedUnits).join(" + ")} = ${unidadesPermuta}`} />
          <Linha label="Unidades vendáveis" valor={unidadesVendaveis + " un."} formula={`Σ (qty − permuta − bloqueio) = ${unidadesVendaveis}`} ok={unidadesVendaveis > 0} />
          <Linha label="Área privativa vendável" valor={areaPrivativa.toLocaleString("pt-BR") + " m²"} formula={`Σ (qty − permuta) × área = ${areaPrivativa.toLocaleString("pt-BR")} m²`} />

          <Secao titulo="2 — Receita" />
          <Linha label="VGV" valor={formatCurrency(indicators.vgv)} formula={`Σ (qty_i × preço_i) = ${formatCurrency(indicators.vgv)}`} ok={indicators.vgv > 0} />
          <Linha label="Valor da permuta" valor={formatCurrency(indicators.vgv - indicators.grossRevenue)} formula={`VGV − Rec. Bruta = ${formatCurrency(indicators.vgv - indicators.grossRevenue)}`} />
          <Linha label="Receita Bruta" valor={formatCurrency(indicators.grossRevenue)} formula={`VGV − valor das unidades permutadas = ${formatCurrency(indicators.grossRevenue)}`} ok={indicators.grossRevenue > 0} />
          <Linha label="(-) Distratos" valor={formatCurrency(indicators.grossRevenue * distratoR)} formula={`Rec. Bruta × ${formatPercent(distratoR)} (configurável em Configurações) = ${formatCurrency(indicators.grossRevenue * distratoR)}`} />
          <Linha label="(-) Inadimplência" valor={formatCurrency(indicators.grossRevenue * inadimR)} formula={`Rec. Bruta × ${formatPercent(inadimR)} = ${formatCurrency(indicators.grossRevenue * inadimR)}`} />
          <Linha label="(-) Tributos (RET)" valor={formatCurrency(indicators.taxes)} formula={`Rec. Bruta × ${formatPercent(taxR)} (RET) = ${formatCurrency(indicators.taxes)}`} />
          <Linha label="Receita Líquida" valor={formatCurrency(indicators.netRevenue)} formula={`Rec. Bruta × (1 − ${formatPercent(distratoR)} − ${formatPercent(inadimR)}) − tributos = ${formatCurrency(indicators.netRevenue)}`} ok={indicators.netRevenue > 0} />

          <Secao titulo="3 — Custos" />
          <Linha label="Aquisição do terreno" valor={formatCurrency(indicators.acquisitionCost)} formula={`land.totalAcquisitionCost = terreno + ITBI + cartório + due diligence + licenças = ${formatCurrency(indicators.acquisitionCost)}`} />
          <Linha label="Custo de construção" valor={formatCurrency(indicators.constructionCost)} formula={`Σ costCategories.budgetValue (${costCategories.length} itens) = ${formatCurrency(indicators.constructionCost)}`} />
          <Linha label="Contingência" valor={formatCurrency(indicators.contingency)} formula={`Σ categorias grupo "Contingência" = ${formatCurrency(indicators.contingency)}`} />
          <Linha label="Despesas indiretas" valor={formatCurrency(indicators.indirectExpenses)} formula={`Σ expenses.value (${expenses.length} itens: admin, equipe, jurídico, marketing...) = ${formatCurrency(indicators.indirectExpenses)}`} />
          <Linha label="Despesas comerciais" valor={formatCurrency(indicators.commercialExpenses)} formula={`Rec. Bruta × ${formatPercent(commR)} (comissão) = ${formatCurrency(indicators.commercialExpenses)}`} />
          <Linha label="Custo financeiro" valor={formatCurrency(indicators.financialCost)} formula={`financing.totalFinancialCost (juros + IOF + TAC) = ${formatCurrency(indicators.financialCost)}`} />
          <Linha label="Custo Total" valor={formatCurrency(indicators.totalCost)} formula={`Terreno + Obra + Indiretos + Comercial + Tributos + Financeiro = ${formatCurrency(indicators.totalCost)}`} ok={indicators.totalCost < indicators.netRevenue} />

          <Secao titulo="4 — Resultado" />
          <Linha label="Lucro Bruto" valor={formatCurrency(indicators.grossProfit)} formula={`Rec. Líq. − terreno − obra − indiretos − comercial (sem financeiro) = ${formatCurrency(indicators.grossProfit)}`} ok={indicators.grossProfit > 0} />
          <Linha label="Lucro Líquido" valor={formatCurrency(indicators.netProfit)} formula={`Rec. Líquida − Custo Total = ${formatCurrency(indicators.netRevenue)} − ${formatCurrency(indicators.totalCost)} = ${formatCurrency(indicators.netProfit)}`} ok={indicators.netProfit > 0} />
          <Linha label="Margem Bruta" valor={formatPercent(indicators.grossMargin)} formula={`Lucro Bruto / Rec. Líquida = ${formatCurrency(indicators.grossProfit)} / ${formatCurrency(indicators.netRevenue)} = ${formatPercent(indicators.grossMargin)}`} ok={indicators.grossMargin > 0.10} />
          <Linha label="Margem Líquida" valor={formatPercent(indicators.netMargin)} formula={`Lucro Líquido / Rec. Líquida = ${formatCurrency(indicators.netProfit)} / ${formatCurrency(indicators.netRevenue)} = ${formatPercent(indicators.netMargin)}`} ok={indicators.netMargin > 0.12} />
          <Linha label="Markup" valor={formatPercent(indicators.markup)} formula={`Lucro Líquido / Custo Total = ${formatPercent(indicators.markup)}`} ok={indicators.markup > 0} />

          <Secao titulo="5 — Retorno" />
          <Linha label="TIR" valor={formatPercent(indicators.irr)} formula={`Bisseção em fluxo mensal de ${cashFlowData.length} meses → taxa mensal → (1+r)^12 − 1 = ${formatPercent(indicators.irr)}`} ok={indicators.irr > tmaR} />
          <Linha label="TIR Alavancada" valor={formatPercent(indicators.leveragedIrr)} formula={`IRR(vendas − todos os custos − serviço da dívida) = ${formatPercent(indicators.leveragedIrr)}`} ok={indicators.leveragedIrr > tmaR} />
          <Linha label="VPL" valor={formatCurrency(indicators.npv)} formula={`Σ [FC_t / (1+TMA/12)^t], TMA = ${formatPercent(tmaR)} a.a. → mensal = ${((Math.pow(1+tmaR,1/12)-1)*100).toFixed(4)}% = ${formatCurrency(indicators.npv)}`} ok={indicators.npv > 0} />
          <Linha label="ROI" valor={formatPercent(indicators.roi)} formula={`Lucro Líquido / Custo Total = ${formatCurrency(indicators.netProfit)} / ${formatCurrency(indicators.totalCost)} = ${formatPercent(indicators.roi)}`} ok={indicators.roi > 0} />
          <Linha label="ROE" valor={formatPercent(indicators.roe)} formula={`Lucro Líquido / Capital Próprio = ${formatCurrency(indicators.netProfit)} / ${formatCurrency(fund.ownCapital)} = ${formatPercent(indicators.roe)}`} ok={indicators.roe > 0} />

          <Secao titulo="6 — Fluxo de Caixa" />
          <Linha label="Saldo final" valor={formatCurrency(finalBalance)} formula={`cashFlowData[${cashFlowData.length-1}].cumulativeFlow = ${formatCurrency(finalBalance)}`} ok={finalBalance > 0} />
          <Linha label="Pico negativo" valor={formatCurrency(peakNeg)} formula={`min(cumulativeFlow[t]) = ${formatCurrency(peakNeg)}`} />
          <Linha label="Exposição máxima" valor={formatCurrency(indicators.maxCashExposure)} formula={`|pico negativo| = ${formatCurrency(indicators.maxCashExposure)}`} ok={indicators.maxCashExposure < indicators.vgv * 0.30} />
          <Linha label="Payback simples" valor={indicators.simplePayback + " meses"} formula={`1º mês com cumulativeFlow ≥ 0 = mês ${indicators.simplePayback}`} ok={indicators.simplePayback <= 36} />
          <Linha label="Payback descontado" valor={indicators.discountedPayback + " meses"} formula={`1º mês com Σ[FC/(1+r)^t] ≥ 0 (TMA) = mês ${indicators.discountedPayback}`} ok={indicators.discountedPayback <= 42} />
          <Linha label="DSCR" valor={indicators.dscr.toFixed(2) + "x"} formula={`Caixa operacional / Serviço da dívida total = ${indicators.dscr.toFixed(2)}x`} ok={indicators.dscr >= 1.2} />
          <Linha label="Índice de Lucratividade" valor={indicators.profitabilityIndex.toFixed(3)} formula={`VP(Entradas) / VP(Saídas) = ${indicators.profitabilityIndex.toFixed(3)}`} ok={indicators.profitabilityIndex > 1} />

          <Secao titulo="7 — Unitários" />
          <Linha label="Custo/m²" valor={"R$ " + indicators.costPerSqm.toLocaleString("pt-BR")} formula={`Custo Total / Área privativa vendável = ${formatCurrency(indicators.totalCost)} / ${areaPrivativa.toLocaleString("pt-BR")} m²`} />
          <Linha label="Lucro/m²" valor={"R$ " + indicators.profitPerSqm.toLocaleString("pt-BR")} formula={`Lucro Líquido / Área privativa = ${formatCurrency(indicators.netProfit)} / ${areaPrivativa.toLocaleString("pt-BR")} m²`} ok={indicators.profitPerSqm > 0} />
          <Linha label="Ticket médio" valor={formatCurrency(indicators.avgTicket)} formula={`VGV / Unidades vendáveis = ${formatCurrency(indicators.vgv)} / ${unidadesVendaveis} un.`} />
          <Linha label="Break-even" valor={indicators.breakEvenPoint + " un."} formula={`Custo Total / Ticket médio = ${formatCurrency(indicators.totalCost)} / ${formatCurrency(indicators.avgTicket)} = ${indicators.breakEvenPoint} un.`} ok={indicators.breakEvenPoint < unidadesVendaveis} />
        </div>
      </div>
    </div>
  );
}
