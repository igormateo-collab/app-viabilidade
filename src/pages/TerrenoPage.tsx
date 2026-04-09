import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { formatCurrency, formatPercent } from "@/data/mockData";
import { useProject } from "@/contexts/ProjectContext";
import { EditableField } from "@/components/EditableField";
import { MapPin } from "lucide-react";

export default function TerrenoPage() {
  const { land, updateLand, indicators, unitTypes, enterprise } = useProject();

  const updateNumericField = (key: string, value: string) => {
    const num = Number(value.replace(/[^\\d.-]/g, ""));
    if (!isNaN(num)) updateLand({ [key]: num });
  };

  // KPIs calculados do contexto
  const landArea = enterprise.landArea || 1000;
  const privateArea = unitTypes.reduce((s, u) => s + (u.quantity - u.swappedUnits) * u.privateArea, 0) || enterprise.privateArea || 1;
  const costPerSqmLand = land.totalAcquisitionCost / Math.max(1, landArea);
  const costPerSqmPrivate = land.totalAcquisitionCost / Math.max(1, privateArea);
  const impactOnVgv = indicators.vgv > 0 ? land.totalAcquisitionCost / indicators.vgv : 0;
  const impactOnMargin = indicators.netRevenue > 0 ? (land.totalAcquisitionCost / indicators.netRevenue) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Terreno e Aquisição" description="Modelagem detalhada da aquisição do terreno" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Custo Total Aquisição" value={formatCurrency(land.totalAcquisitionCost)} icon={MapPin} variant="primary" large className="col-span-2" tooltip="Terreno + todos os custos de aquisição" />
        <KpiCard title="Custo/m² Terreno" value={"R$ " + Math.round(costPerSqmLand).toLocaleString("pt-BR")} tooltip={`Custo total / Área do terreno (${landArea.toLocaleString("pt-BR")} m²)`} />
        <KpiCard title="Custo/m² Privativo" value={"R$ " + Math.round(costPerSqmPrivate).toLocaleString("pt-BR")} tooltip={`Custo total / Área privativa (${privateArea.toLocaleString("pt-BR")} m²)`} />
        <KpiCard title="Impacto no VGV" value={formatPercent(impactOnVgv)} tooltip="Custo de aquisição / VGV total" />
        <KpiCard title="Impacto na Receita" value={formatPercent(impactOnMargin)} variant="warning" tooltip="Custo de aquisição / Receita líquida" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Dados da Aquisição</h3>
          <div className="space-y-1">
            <EditableField label="Valor do Terreno" value={formatCurrency(land.landValue)} onSave={v => updateNumericField("landValue", v)} />
            <EditableField label="Tipo de Aquisição" value={land.acquisitionType} onSave={v => updateLand({ acquisitionType: v })} type="select" options={[
              { label: "Compra Direta", value: "Compra Direta" },
              { label: "Permuta Física", value: "Permuta Física" },
              { label: "Permuta Financeira", value: "Permuta Financeira" },
              { label: "Misto", value: "Misto" },
            ]} />
            <EditableField label="Sinal / Entrada" value={formatCurrency(land.downPayment)} onSave={v => updateNumericField("downPayment", v)} />
            <EditableField label="Nº de Parcelas" value={String(land.installments)} onSave={v => updateNumericField("installments", v)} type="number" />
            <EditableField label="Valor da Parcela" value={formatCurrency(land.installmentValue)} onSave={v => updateNumericField("installmentValue", v)} />
            <EditableField label="Permuta Física %" value={land.physicalSwapPercent + "%"} onSave={v => updateNumericField("physicalSwapPercent", v)} />
            <EditableField label="Unidades em Permuta" value={String(land.physicalSwapUnits)} onSave={v => updateNumericField("physicalSwapUnits", v)} type="number" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Custos Adicionais de Aquisição</h3>
          <div className="space-y-1">
            <EditableField label="Corretagem sobre Aquisição" value={formatCurrency(land.brokerageOnAcquisition)} onSave={v => updateNumericField("brokerageOnAcquisition", v)} />
            <EditableField label="Due Diligence" value={formatCurrency(land.dueDiligence)} onSave={v => updateNumericField("dueDiligence", v)} />
            <EditableField label="Custos Cartoriais" value={formatCurrency(land.notaryCosts)} onSave={v => updateNumericField("notaryCosts", v)} />
            <EditableField label="ITBI" value={formatCurrency(land.itbi)} onSave={v => updateNumericField("itbi", v)} />
            <EditableField label="Registro" value={formatCurrency(land.registration)} onSave={v => updateNumericField("registration", v)} />
            <EditableField label="Honorários Jurídicos" value={formatCurrency(land.legalFees)} onSave={v => updateNumericField("legalFees", v)} />
            <EditableField label="Demolição" value={formatCurrency(land.demolitionCost)} onSave={v => updateNumericField("demolitionCost", v)} />
            <EditableField label="Regularização" value={formatCurrency(land.regularizationCost)} onSave={v => updateNumericField("regularizationCost", v)} />
            <EditableField label="Aprovação" value={formatCurrency(land.approvalCost)} onSave={v => updateNumericField("approvalCost", v)} />
            <EditableField label="Licenciamento" value={formatCurrency(land.licensingCost)} onSave={v => updateNumericField("licensingCost", v)} />
            <EditableField label="Sondagem" value={formatCurrency(land.soilSurvey)} onSave={v => updateNumericField("soilSurvey", v)} />
          </div>
        </div>
      </div>
    </div>
  );
}
