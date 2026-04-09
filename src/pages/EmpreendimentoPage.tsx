import { PageHeader } from "@/components/PageHeader";
import { EditableField } from "@/components/EditableField";
import { useProject } from "@/contexts/ProjectContext";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

export default function EmpreendimentoPage() {
  const { enterprise, updateEnterprise } = useProject();

  const fields = [
    { section: "Identificação", items: [
      { label: "Nome do Projeto", key: "name" },
      { label: "Empresa Responsável", key: "company" },
      { label: "SPE", key: "spe" },
      { label: "Tipo", key: "type", type: "select" as const, options: [
        { label: "Residencial Vertical", value: "Residencial Vertical" },
        { label: "Residencial Horizontal", value: "Residencial Horizontal" },
        { label: "Comercial", value: "Comercial" },
        { label: "Misto", value: "Misto" },
        { label: "Loteamento", value: "Loteamento" },
        { label: "Hotel", value: "Hotel" },
        { label: "Galpão", value: "Galpão" },
        { label: "Retrofit", value: "Retrofit" },
      ]},
      { label: "Padrão", key: "standard", type: "select" as const, options: [
        { label: "Econômico", value: "Econômico" },
        { label: "Médio", value: "Médio" },
        { label: "Alto Padrão", value: "Alto Padrão" },
        { label: "Luxo", value: "Luxo" },
      ]},
    ]},
    { section: "Localização", items: [
      { label: "Endereço", key: "address" },
      { label: "Bairro", key: "neighborhood" },
      { label: "Cidade", key: "city" },
      { label: "Estado", key: "state" },
    ]},
    { section: "Projeto", items: [
      { label: "Torres", key: "towers", type: "number" as const },
      { label: "Pavimentos", key: "floors", type: "number" as const },
      { label: "Total de Unidades", key: "totalUnits", type: "number" as const },
      { label: "Tipologia", key: "typology" },
    ]},
    { section: "Áreas", items: [
      { label: "Área do Terreno (m²)", key: "landArea", type: "number" as const },
      { label: "Área Construída (m²)", key: "builtArea", type: "number" as const },
      { label: "Área Privativa (m²)", key: "privateArea", type: "number" as const },
      { label: "Área Comum (m²)", key: "commonArea", type: "number" as const },
      { label: "Área Vendável (m²)", key: "sellableArea", type: "number" as const },
    ]},
    { section: "Cronograma", items: [
      { label: "Aquisição", key: "acquisitionDate", type: "date" as const },
      { label: "Lançamento", key: "launchDate", type: "date" as const },
      { label: "Início da Obra", key: "constructionStart", type: "date" as const },
      { label: "Entrega", key: "deliveryDate", type: "date" as const },
      { label: "Prazo Total (meses)", key: "totalMonths", type: "number" as const },
    ]},
  ];

  const handleSave = (key: string, value: string) => {
    const numericKeys = ["towers", "blocks", "floors", "totalUnits", "landArea", "builtArea", "privateArea", "commonArea", "sellableArea", "totalMonths"];
    const parsed = numericKeys.includes(key) ? Number(value) : value;
    updateEnterprise({ [key]: parsed } as any);
    toast.success(`"${key}" atualizado com sucesso`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Cadastro do Empreendimento" description="Clique em qualquer campo para editar os dados do projeto">
        <Badge variant="secondary">{enterprise.status === "construction" ? "Em Obras" : enterprise.status}</Badge>
      </PageHeader>

      <div className="bg-accent/30 border border-primary/20 rounded-lg p-3 flex items-center gap-2 text-xs text-primary">
        <RotateCcw className="w-4 h-4" />
        <span>Todos os campos são editáveis. Clique em qualquer valor para alterar.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {fields.map((section) => (
          <div key={section.section} className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-heading font-semibold text-foreground mb-4">{section.section}</h3>
            <div className="space-y-1">
              {section.items.map((item) => (
                <EditableField
                  key={item.key}
                  label={item.label}
                  value={String((enterprise as any)[item.key])}
                  onSave={(v) => handleSave(item.key, v)}
                  type={item.type}
                  options={item.type === "select" ? item.options : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
