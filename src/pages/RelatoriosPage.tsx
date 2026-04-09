import { PageHeader } from "@/components/PageHeader";
import { downloadPDF, downloadExcel } from "@/lib/reportGenerator";
import { useProject } from "@/contexts/ProjectContext";
import { toast } from "sonner";
import { FileText, Sheet } from "lucide-react";

export default function RelatoriosPage() {
  const { enterprise, indicators, unitTypes, costCategories, cashFlowData, scenarios } = useProject();

  const reportData = { enterprise, indicators, unitTypes, costCategories, cashFlowData, scenarios };

  const reports = [
    { name: "Relatório Executivo", desc: "Resumo completo com indicadores, gráficos e parecer final" },
    { name: "Relatório Resumido", desc: "Versão compacta com KPIs principais" },
    { name: "Fluxo de Caixa Completo", desc: "Fluxo mensal detalhado com todas as linhas" },
    { name: "Composição de Custos", desc: "Detalhamento de todos os custos por categoria e grupo" },
    { name: "Relatório Comercial", desc: "Vendas projetadas, curva de absorção e receita" },
    { name: "Análise de Sensibilidade", desc: "Tornado, Monte Carlo e pontos de ruptura" },
    { name: "Relatório de Funding", desc: "Estrutura de capital, financiamento e custos da dívida" },
    { name: "Comparativo de Cenários", desc: "Análise lado a lado entre cenários" },
    { name: "Parecer Executivo Final", desc: "Conclusão e recomendação sobre a viabilidade" },
  ];

  const handlePDF = (name: string) => {
    try {
      downloadPDF(name, reportData);
      toast.success(`PDF "${name}" gerado com dados atuais do projeto`);
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  const handleExcel = (name: string) => {
    try {
      downloadExcel(name, reportData);
      toast.success(`Excel "${name}" gerado com sucesso`);
    } catch {
      toast.error("Erro ao gerar Excel");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios Gerenciais"
        description={`Relatórios exportáveis em PDF e Excel — dados do projeto atual: ${enterprise.name}`}
      />

      <div className="bg-accent/20 border border-primary/20 rounded-lg p-3 text-xs text-primary flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Todos os relatórios usam os dados calculados em tempo real do projeto. Atualize qualquer premissa e os relatórios refletirão automaticamente.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => (
          <div key={r.name} className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors">
            <h3 className="text-sm font-heading font-semibold text-foreground mb-1">{r.name}</h3>
            <p className="text-xs text-muted-foreground mb-3">{r.desc}</p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-success uppercase tracking-wider font-medium">Dados Atualizados</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePDF(r.name)}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors cursor-pointer"
                >
                  <FileText className="h-3 w-3" /> PDF
                </button>
                <button
                  onClick={() => handleExcel(r.name)}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-success/10 text-success rounded-md hover:bg-success/20 transition-colors cursor-pointer"
                >
                  <Sheet className="h-3 w-3" /> Excel
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumo dos indicadores atuais */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Dados que serão exportados</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
          {[
            { label: "VGV", value: "R$ " + (indicators.vgv / 1e6).toFixed(1) + "M" },
            { label: "Rec. Líquida", value: "R$ " + (indicators.netRevenue / 1e6).toFixed(1) + "M" },
            { label: "Lucro Líquido", value: "R$ " + (indicators.netProfit / 1e6).toFixed(1) + "M" },
            { label: "Margem", value: (indicators.netMargin * 100).toFixed(1) + "%" },
            { label: "TIR", value: (indicators.irr * 100).toFixed(1) + "%" },
            { label: "VPL", value: "R$ " + (indicators.npv / 1e6).toFixed(1) + "M" },
            { label: "Meses fluxo", value: cashFlowData.length + " meses" },
            { label: "Cenários", value: scenarios.length + " calculados" },
            { label: "Tipologias", value: unitTypes.length + " tipos" },
            { label: "Cat. Custo", value: costCategories.length + " itens" },
            { label: "Payback", value: indicators.simplePayback + " meses" },
            { label: "DSCR", value: indicators.dscr.toFixed(2) + "x" },
          ].map(item => (
            <div key={item.label} className="text-center">
              <div className="text-muted-foreground uppercase tracking-wide text-[10px]">{item.label}</div>
              <div className="font-bold text-foreground text-sm">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
