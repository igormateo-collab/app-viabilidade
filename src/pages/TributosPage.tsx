import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EditableField } from "@/components/EditableField";
import { useProject } from "@/contexts/ProjectContext";
import { formatCurrency, formatPercent } from "@/data/mockData";
import { Calculator, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function TributosPage() {
  const { tax, updateTax, indicators } = useProject();

  const percentFields = [
    { label: "Regime Tributário", key: "regime" },
    { label: "SPE", key: "spe", format: (v: any) => v ? "Sim" : "Não" },
    { label: "Alíquota RET", key: "retRate", format: formatPercent },
    { label: "PIS", key: "pis", format: formatPercent },
    { label: "COFINS", key: "cofins", format: formatPercent },
    { label: "IRPJ", key: "irpj", format: formatPercent },
    { label: "CSLL", key: "csll", format: formatPercent },
    { label: "ISS", key: "iss", format: formatPercent },
    { label: "ITBI", key: "itbi", format: formatPercent },
    { label: "Taxas de Aprovação", key: "approvalFees", format: formatCurrency },
    { label: "Taxas Cartoriais", key: "notaryFees", format: formatCurrency },
    { label: "Taxas de Registro", key: "registrationFees", format: formatCurrency },
    { label: "Total Tributos sobre Receita", key: "totalTaxOnRevenue", format: formatCurrency },
    { label: "Alíquota Efetiva", key: "effectiveRate", format: formatPercent },
  ];

  const handleSave = (key: string, value: string) => {
    const numericKeys = ["retRate", "pis", "cofins", "irpj", "csll", "iss", "itbi", "approvalFees", "notaryFees", "registrationFees", "totalTaxOnRevenue", "effectiveRate"];
    const boolKeys = ["spe"];
    let parsed: any = value;
    if (boolKeys.includes(key)) parsed = value.toLowerCase() === "sim";
    else if (numericKeys.includes(key)) parsed = Number(value);
    updateTax({ [key]: parsed } as any);
    toast.success("Tributo atualizado");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tributos e Taxas" description="Clique em qualquer campo para editar o regime tributário" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Total Tributos" value={formatCurrency(indicators.taxes)} icon={Calculator} variant="warning" large tooltip="Total de tributos sobre receita" />
        <KpiCard title="Alíquota Efetiva" value={formatPercent(indicators.grossRevenue > 0 ? indicators.taxes / indicators.grossRevenue : 0)} tooltip="Alíquota efetiva calculada sobre a receita bruta" />
        <KpiCard title="Regime" value="RET" tooltip="Regime Especial de Tributação — alíquota unificada de 4%" />
        <KpiCard title="SPE" value={tax.spe ? "Ativa" : "Inativa"} variant={tax.spe ? "success" : "warning"} tooltip="Sociedade de Propósito Específico" />
      </div>

      <div className="bg-accent/30 border border-primary/20 rounded-lg p-3 flex items-center gap-2 text-xs text-primary">
        <RotateCcw className="w-4 h-4" />
        <span>Todos os campos são editáveis. Clique em qualquer valor para alterar.</span>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Parametrização Tributária</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          {percentFields.map((item) => (
            <EditableField
              key={item.key}
              label={item.label}
              value={item.format ? item.format((tax as any)[item.key]) : String((tax as any)[item.key])}
              onSave={(v) => handleSave(item.key, v)}
            />
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Nota sobre Parametrização</h3>
        <p className="text-sm text-muted-foreground font-body leading-relaxed">
          Toda a lógica tributária é parametrizável. As alíquotas de PIS, COFINS, IRPJ, CSLL e ISS podem ser
          ajustadas individualmente. O sistema suporta RET (4% unificado), Lucro Presumido e Lucro Real,
          com cálculo automático do impacto na margem e no fluxo de caixa.
        </p>
      </div>
    </div>
  );
}
