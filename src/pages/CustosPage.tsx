import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { formatCurrency } from "@/data/mockData";
import { useProject } from "@/contexts/ProjectContext";
import { useProject } from "@/contexts/ProjectContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Hammer, Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["hsl(239,84%,67%)", "hsl(199,89%,48%)", "hsl(142,71%,45%)", "hsl(38,92%,50%)", "hsl(0,72%,51%)", "hsl(280,65%,60%)", "hsl(320,70%,55%)", "hsl(170,60%,45%)"];

export default function CustosPage() {
  const { indicators, enterprise } = useProject();
  const { costCategories, addCostCategory, removeCostCategory, updateCostCategory } = useProject();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ category: "", group: "", budgetValue: "" });
  const [adding, setAdding] = useState(false);
  const [newCost, setNewCost] = useState({ category: "", group: "", budgetValue: "" });

  const totalCost = costCategories.reduce((sum, c) => sum + c.budgetValue, 0);

  const byGroup = costCategories.reduce((acc, c) => {
    acc[c.group] = (acc[c.group] || 0) + c.budgetValue;
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(byGroup).map(([name, value]) => ({ name, value }));

  const startEdit = (id: string) => {
    const c = costCategories.find(x => x.id === id);
    if (!c) return;
    setEditData({ category: c.category, group: c.group, budgetValue: String(c.budgetValue) });
    setEditingId(id);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const val = Number(editData.budgetValue);
    const newTotal = costCategories.reduce((s, c) => c.id === editingId ? s + val : s + c.budgetValue, 0);
    updateCostCategory(editingId, {
      category: editData.category,
      group: editData.group,
      budgetValue: val,
      percentOfTotal: newTotal > 0 ? (val / newTotal) * 100 : 0,
    });
    setEditingId(null);
    toast.success("Custo atualizado");
  };

  const handleAdd = () => {
    const val = Number(newCost.budgetValue);
    if (!newCost.category || !newCost.group || !val) {
      toast.error("Preencha categoria, grupo e valor");
      return;
    }
    const newTotal = totalCost + val;
    addCostCategory({
      id: `c-${Date.now()}`,
      category: newCost.category,
      group: newCost.group,
      budgetValue: val,
      percentOfTotal: newTotal > 0 ? (val / newTotal) * 100 : 0,
    });
    setNewCost({ category: "", group: "", budgetValue: "" });
    setAdding(false);
    toast.success("Custo adicionado");
  };

  const handleRemove = (id: string) => {
    removeCostCategory(id);
    toast.success("Custo removido");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Custos de Incorporação e Construção" description="Detalhamento completo de custos diretos e indiretos da obra" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Custo Total de Obra" value={formatCurrency(totalCost)} icon={Hammer} variant="primary" large className="col-span-2" />
        <KpiCard title="Custo/m² Privativo" value={"R$ " + Math.round(totalCost / Math.max(1, (enterprise.privateArea || 14400))).toLocaleString("pt-BR")} tooltip="Custo total / 14.400 m² de área privativa" />
        <KpiCard title="Categorias" value={costCategories.length + " itens"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-heading font-semibold text-foreground">Detalhamento por Categoria</h3>
            <Button size="sm" variant="outline" onClick={() => setAdding(!adding)} className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </Button>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm font-body">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-xs text-muted-foreground font-medium">Categoria</th>
                  <th className="text-left p-3 text-xs text-muted-foreground font-medium">Grupo</th>
                  <th className="text-right p-3 text-xs text-muted-foreground font-medium">Valor</th>
                  <th className="text-right p-3 text-xs text-muted-foreground font-medium">%</th>
                  <th className="text-center p-3 text-xs text-muted-foreground font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {adding && (
                  <tr className="border-b border-border bg-accent/10">
                    <td className="p-2"><Input value={newCost.category} onChange={e => setNewCost({ ...newCost, category: e.target.value })} placeholder="Categoria" className="h-7 text-xs" /></td>
                    <td className="p-2"><Input value={newCost.group} onChange={e => setNewCost({ ...newCost, group: e.target.value })} placeholder="Grupo" className="h-7 text-xs" /></td>
                    <td className="p-2"><Input type="number" value={newCost.budgetValue} onChange={e => setNewCost({ ...newCost, budgetValue: e.target.value })} placeholder="0" className="h-7 text-xs text-right" /></td>
                    <td className="p-2 text-right text-xs text-muted-foreground">auto</td>
                    <td className="p-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={handleAdd} className="text-emerald-400 hover:text-emerald-300 p-1"><Save className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setAdding(false)} className="text-destructive hover:text-destructive/80 p-1"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )}
                {costCategories.map(c => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    {editingId === c.id ? (
                      <>
                        <td className="p-2"><Input value={editData.category} onChange={e => setEditData({ ...editData, category: e.target.value })} className="h-7 text-xs" /></td>
                        <td className="p-2"><Input value={editData.group} onChange={e => setEditData({ ...editData, group: e.target.value })} className="h-7 text-xs" /></td>
                        <td className="p-2"><Input type="number" value={editData.budgetValue} onChange={e => setEditData({ ...editData, budgetValue: e.target.value })} className="h-7 text-xs text-right" /></td>
                        <td className="p-2 text-right text-xs text-muted-foreground">auto</td>
                        <td className="p-2 text-center">
                          <div className="flex gap-1 justify-center">
                            <button onClick={saveEdit} className="text-emerald-400 hover:text-emerald-300 p-1"><Save className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingId(null)} className="text-destructive hover:text-destructive/80 p-1"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 text-foreground cursor-pointer" onClick={() => startEdit(c.id)}>{c.category}</td>
                        <td className="p-3 text-muted-foreground cursor-pointer" onClick={() => startEdit(c.id)}>{c.group}</td>
                        <td className="p-3 text-right text-foreground">{formatCurrency(c.budgetValue)}</td>
                        <td className="p-3 text-right text-primary font-medium">{totalCost > 0 ? ((c.budgetValue / totalCost) * 100).toFixed(1) : 0}%</td>
                        <td className="p-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => startEdit(c.id)} className="text-muted-foreground hover:text-foreground p-1"><Save className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleRemove(c.id)} className="text-destructive/60 hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td className="p-3 text-foreground" colSpan={2}>Total</td>
                  <td className="p-3 text-right text-foreground">{formatCurrency(totalCost)}</td>
                  <td className="p-3 text-right text-primary">100%</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Composição por Grupo</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
