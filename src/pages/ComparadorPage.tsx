import { PageHeader } from "@/components/PageHeader";
import { indicators, formatCurrency, formatPercent } from "@/data/mockData";

const projects = [
  { name: "Parque das Águas", vgv: 154200000, margin: 0.194, irr: 0.224, npv: 14520000, exposure: 38500000, costSqm: 7457, payback: 28, speed: 3.5, capital: 42000000 },
  { name: "Vila Bela", vgv: 82500000, margin: 0.165, irr: 0.185, npv: 6800000, exposure: 22000000, costSqm: 6200, payback: 32, speed: 2.8, capital: 25000000 },
  { name: "Alto do Parque", vgv: 210000000, margin: 0.212, irr: 0.258, npv: 22500000, exposure: 48000000, costSqm: 8100, payback: 26, speed: 4.2, capital: 55000000 },
];

export default function ComparadorPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Comparação entre Empreendimentos" description="Análise comparativa de múltiplos projetos" />

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 text-xs text-muted-foreground font-medium">Indicador</th>
                {projects.map(p => (
                  <th key={p.name} className="text-right p-3 text-xs text-muted-foreground font-medium">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "VGV", key: "vgv", fmt: formatCurrency },
                { label: "Margem Líquida", key: "margin", fmt: formatPercent },
                { label: "TIR", key: "irr", fmt: formatPercent },
                { label: "VPL", key: "npv", fmt: formatCurrency },
                { label: "Exposição Caixa", key: "exposure", fmt: formatCurrency },
                { label: "Custo/m²", key: "costSqm", fmt: (v: number) => "R$ " + v.toLocaleString("pt-BR") },
                { label: "Payback", key: "payback", fmt: (v: number) => v + " meses" },
                { label: "Vel. Vendas", key: "speed", fmt: (v: number) => v + " un/mês" },
                { label: "Capital", key: "capital", fmt: formatCurrency },
              ].map(row => (
                <tr key={row.label} className="border-b border-border/50 hover:bg-accent/20">
                  <td className="p-3 text-foreground font-medium">{row.label}</td>
                  {projects.map(p => (
                    <td key={p.name} className="p-3 text-right text-foreground">{row.fmt((p as any)[row.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
