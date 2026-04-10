import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EditableField } from "@/components/EditableField";
import { useProject } from "@/contexts/ProjectContext";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, Search, Loader2, MapPin, ExternalLink } from "lucide-react";

export default function EmpreendimentoPage() {
  const { enterprise, updateEnterprise } = useProject();
  const [cep, setCep] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);

  const fullAddress = useMemo(() => {
    const parts = [enterprise.address, enterprise.neighborhood, enterprise.city, enterprise.state]
      .filter(Boolean).join(", ");
    return parts;
  }, [enterprise.address, enterprise.neighborhood, enterprise.city, enterprise.state]);

  const mapsSearchUrl = useMemo(() => {
    if (!fullAddress) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  }, [fullAddress]);

  const mapsEmbedUrl = useMemo(() => {
    if (!fullAddress) return null;
    return `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed&hl=pt-BR&z=15`;
  }, [fullAddress]);

  const handleSave = (key: string, value: string) => {
    const numericKeys = ["towers", "blocks", "floors", "totalUnits", "landArea", "builtArea", "privateArea", "commonArea", "sellableArea", "totalMonths"];
    const parsed = numericKeys.includes(key) ? Number(value) : value;
    updateEnterprise({ [key]: parsed } as any);
    toast.success("Campo atualizado");
  };

  const buscarCep = async () => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) {
      toast.error("CEP inválido — digite os 8 dígitos");
      return;
    }
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }
      updateEnterprise({
        address: data.logradouro || enterprise.address,
        neighborhood: data.bairro || enterprise.neighborhood,
        city: data.localidade || enterprise.city,
        state: data.uf || enterprise.state,
      });
      toast.success(`Endereço preenchido: ${data.localidade} — ${data.uf}`);
    } catch {
      toast.error("Erro ao buscar CEP — verifique a conexão");
    } finally {
      setLoadingCep(false);
    }
  };

  const handleCepKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") buscarCep();
  };

  const formatCep = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
  };

  const identificacaoFields = [
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
  ];

  const localizacaoFields = [
    { label: "Logradouro / Endereço", key: "address" },
    { label: "Bairro", key: "neighborhood" },
    { label: "Cidade", key: "city" },
    { label: "Estado (UF)", key: "state" },
  ];

  const projetoFields = [
    { label: "Torres", key: "towers", type: "number" as const },
    { label: "Pavimentos", key: "floors", type: "number" as const },
    { label: "Total de Unidades", key: "totalUnits", type: "number" as const },
    { label: "Tipologia", key: "typology" },
  ];

  const areasFields = [
    { label: "Área do Terreno (m²)", key: "landArea", type: "number" as const },
    { label: "Área Construída (m²)", key: "builtArea", type: "number" as const },
    { label: "Área Privativa (m²)", key: "privateArea", type: "number" as const },
    { label: "Área Comum (m²)", key: "commonArea", type: "number" as const },
    { label: "Área Vendável (m²)", key: "sellableArea", type: "number" as const },
  ];

  const cronogramaFields = [
    { label: "Aquisição", key: "acquisitionDate", type: "date" as const },
    { label: "Lançamento", key: "launchDate", type: "date" as const },
    { label: "Início da Obra", key: "constructionStart", type: "date" as const },
    { label: "Entrega", key: "deliveryDate", type: "date" as const },
    { label: "Prazo Total (meses)", key: "totalMonths", type: "number" as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Cadastro do Empreendimento" description="Clique em qualquer campo para editar os dados do projeto">
        <Badge variant="secondary">{enterprise.status === "construction" ? "Em Obras" : enterprise.status}</Badge>
      </PageHeader>

      <div className="bg-accent/30 border border-primary/20 rounded-lg p-3 flex items-center gap-2 text-xs text-primary">
        <RotateCcw className="w-4 h-4" />
        <span>Todos os campos são editáveis. Use o CEP para preencher o endereço automaticamente.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Identificação */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Identificação</h3>
          <div className="space-y-1">
            {identificacaoFields.map(item => (
              <EditableField
                key={item.key}
                label={item.label}
                value={String((enterprise as any)[item.key] ?? "")}
                onSave={v => handleSave(item.key, v)}
                type={item.type}
                options={(item as any).options}
              />
            ))}
          </div>
        </div>

        {/* Localização — com busca de CEP */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Localização</h3>

          {/* Busca de CEP */}
          <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <label className="text-[11px] uppercase tracking-wider text-primary/70 font-medium mb-2 block flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Buscar pelo CEP
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={cep}
                onChange={e => setCep(formatCep(e.target.value))}
                onKeyDown={handleCepKeyDown}
                placeholder="00000-000"
                maxLength={9}
                className="flex-1 h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              <button
                onClick={buscarCep}
                disabled={loadingCep}
                className="flex items-center gap-1.5 px-4 h-9 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {loadingCep
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...</>
                  : <><Search className="h-3.5 w-3.5" /> Buscar</>
                }
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">Preenche logradouro, bairro, cidade e estado automaticamente via ViaCEP</p>
          </div>

          <div className="space-y-1">
            {localizacaoFields.map(item => (
              <EditableField
                key={item.key}
                label={item.label}
                value={String((enterprise as any)[item.key] ?? "")}
                onSave={v => handleSave(item.key, v)}
              />
            ))}
          </div>

          {/* Google Maps */}
          {mapsEmbedUrl && (
            <div className="mt-4 space-y-2">
              <div className="rounded-lg overflow-hidden border border-border">
                <iframe
                  key={mapsEmbedUrl}
                  src={mapsEmbedUrl}
                  width="100%"
                  height="220"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Localização no mapa"
                />
              </div>
              <a
                href={mapsSearchUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-9 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir no Google Maps
              </a>
            </div>
          )}

          {!fullAddress && (
            <p className="mt-3 text-[11px] text-muted-foreground text-center py-2">
              Preencha o endereço acima para ver o mapa
            </p>
          )}
        </div>

        {/* Projeto */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Projeto</h3>
          <div className="space-y-1">
            {projetoFields.map(item => (
              <EditableField
                key={item.key}
                label={item.label}
                value={String((enterprise as any)[item.key] ?? "")}
                onSave={v => handleSave(item.key, v)}
                type={item.type}
              />
            ))}
          </div>
        </div>

        {/* Áreas */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Áreas</h3>
          <div className="space-y-1">
            {areasFields.map(item => (
              <EditableField
                key={item.key}
                label={item.label}
                value={String((enterprise as any)[item.key] ?? "")}
                onSave={v => handleSave(item.key, v)}
                type={item.type}
              />
            ))}
          </div>
        </div>

        {/* Cronograma */}
        <div className="bg-card border border-border rounded-lg p-5 lg:col-span-2">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Cronograma</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div className="space-y-1">
              {cronogramaFields.slice(0, 3).map(item => (
                <EditableField
                  key={item.key}
                  label={item.label}
                  value={String((enterprise as any)[item.key] ?? "")}
                  onSave={v => handleSave(item.key, v)}
                  type={item.type}
                />
              ))}
            </div>
            <div className="space-y-1">
              {cronogramaFields.slice(3).map(item => (
                <EditableField
                  key={item.key}
                  label={item.label}
                  value={String((enterprise as any)[item.key] ?? "")}
                  onSave={v => handleSave(item.key, v)}
                  type={item.type}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
