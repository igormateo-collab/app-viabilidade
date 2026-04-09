import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EditableField } from "@/components/EditableField";
import { useProject } from "@/contexts/ProjectContext";
import { formatCurrency } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Receipt, RotateCcw, Plus, Save, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DespesasPage() {
  const { expenses, updateExpenses } = useProject();
  const total = expenses.reduce((s, e) => s + e.value, 0);
  const [adding, setAdding] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: "", value: "" });

  const handleSaveValue = (index: number, newValue: string) => {
    const updated = [...expenses];
    const numVal = Number(newValue.replace(/[^\d.-]/g, ""));
    if (isNaN(numVal)) return;
    updated[index] = { ...updated[index], value: numVal };
    const newTotal = updated.reduce((s, e) => s + e.value, 0);
    const recalculated = updated.map(e => ({ ...e, percent: newTotal > 0 ? (e.value / newTotal) * 100 : 0 }));
    updateExpenses(recalculated);
    toast.success("Despesa atualizada");
  };

  const handleAdd = () => {
    const val = Number(newExpense.value);
    if (!newExpense.category || !val) {
      toast.error("Preencha categoria e valor");
      return;
    }
    const updated = [...expenses, { category: newExpense.category, value: val, percent: 0 }];
    const newTotal = updated.reduce((s, e) => s + e.value, 0);
    const recalculated = updated.map(e => ({ ...e, percent: newTotal > 0 ? (e.value / newTotal) * 100 : 0 }));
    updateExpenses(recalculated);
    setNewExpense({ category: "", value: "" });
    setAdding(false);
    toast.success("Despesa adicionada");
  };

  const handleRemove = (index: number) => {
    const updated = expenses.filter((_, i) => i !== index);
    const newTotal = updated.reduce((s, e) => s + e.value, 0);
    const recalculated = updated.map(e => ({ ...e, percent: newTotal > 0 ? (e.value / newTotal) * 100 : 0 }));
    updateExpenses(recalculated);
    toast.success("Despesa removida");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Despesas Indiretas e Administrativas" description="Clique em qualquer valor para editar" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard title="Total Despesas Indiretas" value={formatCurrency(total)} icon={Receipt} variant="primary" large />
        <KpiCard title="% sobre VGV" value={((total / 154200000) * 100).toFixed(2) + "%"} tooltip="Total de despesas indiretas / VGV" />
        <KpiCard title="Categorias" value={expenses.length + " itens"} />
      </div>

      <div className="bg-accent/30 border border-primary/20 rounded-lg p-3 flex items-center gap-2 text-xs text-primary">
        <RotateCcw className="w-4 h-4" />
        <span>Clique nos valores para editar. Use os botões para adicionar ou remover despesas.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-heading font-semibold text-foreground">Detalhamento de Despesas</h3>
            <Button size="sm" variant="outline" onClick={() => setAdding(!adding)} className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </Button>
          </div>

          {adding && (
            <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-md border border-border/50 mb-2">
              <Input value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} placeholder="Categoria" className="h-7 text-xs flex-1" />
              <Input type="number" value={newExpense.value} onChange={e => setNewExpense({ ...newExpense, value: e.target.value })} placeholder="Valor" className="h-7 text-xs w-28 text-right" />
              <button onClick={handleAdd} className="text-emerald-400 hover:text-emerald-300 p-1"><Save className="w-3.5 h-3.5" /></button>
              <button onClick={() => setAdding(false)} className="text-destructive hover:text-destructive/80 p-1"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {expenses.map((e, i) => (
            <div key={i} className="flex items-center gap-1 group">
              <div className="flex-1">
                <EditableField
                  label={e.category}
                  value={formatCurrency(e.value)}
                  onSave={(v) => handleSaveValue(i, v)}
                />
              </div>
              <button onClick={() => handleRemove(i)} className="text-destructive/40 hover:text-destructive p-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
            <span className="text-xs font-semibold text-foreground">Total</span>
            <span className="text-sm font-bold text-primary">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Composição de Despesas</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={expenses} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => (v / 1e6).toFixed(1) + "M"} />
              <YAxis type="category" dataKey="category" width={150} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
