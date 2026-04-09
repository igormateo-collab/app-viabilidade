import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { formatCurrency, formatPercent } from "@/data/mockData";
import { useProject } from "@/contexts/ProjectContext";
import { EditableField } from "@/components/EditableField";
import { Landmark } from "lucide-react";

export default function FundingPage() {
  const { fund, updateFund, indicators } = useProject();

  const updateNum = (key: string, value: string) => {
    const num = Number(value.replace(/[^\d.-]/g, ""));
    if (!isNaN(num)) updateFund({ [key]: num });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Funding / Capital / Financiamento" description="Estrutura de capital, financiamento à produção e custos da dívida" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Capital Próprio" value={formatCurrency(fund.ownCapital)} icon={Landmark} variant="primary" tooltip="Total de capital próprio aportado" />
        <KpiCard title="Financiamento" value={formatCurrency(fund.productionFinancing)} tooltip="Valor total do financiamento à produção" />
        <KpiCard title="Custo Financeiro" value={formatCurrency(fund.totalFinancialCost)} variant="warning" tooltip="Custo total dos juros e encargos financeiros" />
        <KpiCard title="DSCR" value={indicators.dscr.toFixed(2) + "x"} variant={indicators.dscr >= 1.2 ? "success" : "warning"} tooltip="Debt Service Coverage Ratio — calculado do fluxo de caixa" />
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Detalhamento do Funding</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div className="space-y-1">
            <EditableField label="Capital Próprio" value={formatCurrency(fund.ownCapital)} onSave={v => updateNum("ownCapital", v)} />
            <EditableField label="Aporte Inicial dos Sócios" value={formatCurrency(fund.initialEquity)} onSave={v => updateNum("initialEquity", v)} />
            <EditableField label="Chamadas de Capital" value={formatCurrency(fund.capitalCalls)} onSave={v => updateNum("capitalCalls", v)} />
            <EditableField label="Financiamento à Produção" value={formatCurrency(fund.productionFinancing)} onSave={v => updateNum("productionFinancing", v)} />
            <EditableField label="Taxa de Juros (a.a.)" value={formatPercent(fund.interestRate)} onSave={v => updateNum("interestRate", v)} />
            <EditableField label="IOF" value={formatCurrency(fund.iof)} onSave={v => updateNum("iof", v)} />
            <EditableField label="TAC" value={formatCurrency(fund.tac)} onSave={v => updateNum("tac", v)} />
            <EditableField label="Carência" value={fund.gracePeriod + " meses"} onSave={v => updateNum("gracePeriod", v)} />
          </div>
          <div className="space-y-1">
            <EditableField label="Amortização" value={fund.amortizationMonths + " meses"} onSave={v => updateNum("amortizationMonths", v)} />
            <EditableField label="Liberação" value={fund.releaseScheduleMonths + " meses"} onSave={v => updateNum("releaseScheduleMonths", v)} />
            <EditableField label="Garantias" value={fund.guarantees} onSave={v => updateFund({ guarantees: v })} />
            <EditableField label="Dívida Máxima" value={formatCurrency(fund.maxDebt)} onSave={v => updateNum("maxDebt", v)} />
            <EditableField label="Custo Financeiro Total" value={formatCurrency(fund.totalFinancialCost)} onSave={v => updateNum("totalFinancialCost", v)} />
            <EditableField label="Alavancagem" value={formatPercent(fund.leverageRatio)} onSave={v => updateNum("leverageRatio", v)} />
            <EditableField label="Capital Próprio vs Terceiros" value={fund.ownVsThird} onSave={v => updateFund({ ownVsThird: v })} />
            <EditableField label="DSCR" value={fund.dscr.toFixed(2) + "x"} onSave={v => updateNum("dscr", v)} />
          </div>
        </div>
      </div>
    </div>
  );
}
