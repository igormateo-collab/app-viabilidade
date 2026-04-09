import { PageHeader } from "@/components/PageHeader";
import { EditableField } from "@/components/EditableField";
import { useProject } from "@/contexts/ProjectContext";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

export default function ConfiguracoesPage() {
  const { settings, updateSettings } = useProject();

  const sections = [
    { section: "Índices Econômicos", items: [
      { label: "INCC (a.a.)", key: "incc" },
      { label: "IPCA (a.a.)", key: "ipca" },
      { label: "CDI (a.a.)", key: "cdi" },
      { label: "Selic (a.a.)", key: "selic" },
    ]},
    { section: "Premissas de Análise", items: [
      { label: "Taxa Mínima de Atratividade (TMA)", key: "tma" },
      { label: "Taxa de Desconto (VPL)", key: "discountRate" },
      { label: "Moeda", key: "currency" },
      { label: "Arredondamento", key: "rounding" },
    ]},
    { section: "Premissas Comerciais", items: [
      { label: "Distrato Padrão", key: "defaultDistrato" },
      { label: "Inadimplência Padrão", key: "defaultInadimplencia" },
      { label: "Comissão de Vendas", key: "salesCommission" },
      { label: "Reajuste de Preço (índice)", key: "priceAdjustIndex" },
    ]},
    { section: "Parâmetros de Alerta", items: [
      { label: "Margem mínima para viabilidade", key: "minMargin" },
      { label: "TIR mínima para viabilidade", key: "minIrr" },
      { label: "Exposição máxima aceitável", key: "maxExposure" },
      { label: "Payback máximo aceitável", key: "maxPayback" },
    ]},
  ];

  const handleSave = (key: string, value: string) => {
    updateSettings({ [key]: value } as any);
    toast.success("Configuração atualizada");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações e Premissas Globais" description="Clique em qualquer campo para editar índices e premissas" />

      <div className="bg-accent/30 border border-primary/20 rounded-lg p-3 flex items-center gap-2 text-xs text-primary">
        <RotateCcw className="w-4 h-4" />
        <span>Todos os campos são editáveis. Clique em qualquer valor para alterar.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map(section => (
          <div key={section.section} className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-heading font-semibold text-foreground mb-4">{section.section}</h3>
            <div className="space-y-1">
              {section.items.map(item => (
                <EditableField
                  key={item.key}
                  label={item.label}
                  value={(settings as any)[item.key]}
                  onSave={(v) => handleSave(item.key, v)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
