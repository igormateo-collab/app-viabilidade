import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { formatCurrency, formatPercent } from "@/data/mockData";
import { useProject } from "@/contexts/ProjectContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function ProdutoPage() {
  const { unitTypes, addUnitType, removeUnitType, updateUnitType } = useProject();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [newUnit, setNewUnit] = useState({
    name: "", quantity: "", privateArea: "", parkingSpots: "",
    unitPrice: "", swappedUnits: "", blockedUnits: "", stockUnits: "",
  });

  const totalVgv = unitTypes.reduce((s, u) => s + u.quantity * u.unitPrice, 0);

  const chartData = unitTypes.map(ut => ({
    name: ut.name,
    VGV: ut.quantity * ut.unitPrice,
  }));

  const startEdit = (id: string) => {
    const u = unitTypes.find(x => x.id === id);
    if (!u) return;
    setEditData({
      name: u.name,
      quantity: String(u.quantity),
      privateArea: String(u.privateArea),
      parkingSpots: String(u.parkingSpots),
      unitPrice: String(u.unitPrice),
      swappedUnits: String(u.swappedUnits),
      blockedUnits: String(u.blockedUnits),
      stockUnits: String(u.stockUnits),
    });
    setEditingId(id);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const qty = Number(editData.quantity);
    const price = Number(editData.unitPrice);
    const area = Number(editData.privateArea);
    const swapped = Number(editData.swappedUnits);
    const blocked = Number(editData.blockedUnits);
    const stock = Number(editData.stockUnits);
    const sellable = qty - swapped - blocked - stock;
    const newTotalVgv = unitTypes.reduce((s, u) => {
      if (u.id === editingId) return s + qty * price;
      return s + u.quantity * u.unitPrice;
    }, 0);

    updateUnitType(editingId, {
      name: editData.name,
      quantity: qty,
      privateArea: area,
      parkingSpots: Number(editData.parkingSpots),
      unitPrice: price,
      pricePerSqm: area > 0 ? Math.round(price / area) : 0,
      swappedUnits: swapped,
      blockedUnits: blocked,
      stockUnits: stock,
      sellableUnits: sellable > 0 ? sellable : 0,
      vgvShare: newTotalVgv > 0 ? (qty * price) / newTotalVgv : 0,
    });
    setEditingId(null);
    toast.success("Tipologia atualizada");
  };

  const handleAdd = () => {
    const qty = Number(newUnit.quantity);
    const price = Number(newUnit.unitPrice);
    const area = Number(newUnit.privateArea);
    const swapped = Number(newUnit.swappedUnits || "0");
    const blocked = Number(newUnit.blockedUnits || "0");
    const stock = Number(newUnit.stockUnits || "0");
    if (!newUnit.name || !qty || !price) {
      toast.error("Preencha nome, quantidade e preço");
      return;
    }
    const sellable = qty - swapped - blocked - stock;
    const newVgv = qty * price;
    const updatedTotalVgv = totalVgv + newVgv;

    addUnitType({
      id: `ut-${Date.now()}`,
      name: newUnit.name,
      quantity: qty,
      privateArea: area,
      parkingSpots: Number(newUnit.parkingSpots || "0"),
      unitPrice: price,
      pricePerSqm: area > 0 ? Math.round(price / area) : 0,
      swappedUnits: swapped,
      blockedUnits: blocked,
      stockUnits: stock,
      sellableUnits: sellable > 0 ? sellable : 0,
      vgvShare: updatedTotalVgv > 0 ? newVgv / updatedTotalVgv : 0,
    });
    setNewUnit({ name: "", quantity: "", privateArea: "", parkingSpots: "", unitPrice: "", swappedUnits: "", blockedUnits: "", stockUnits: "" });
    setAdding(false);
    toast.success("Tipologia adicionada");
  };

  const handleRemove = (id: string) => {
    removeUnitType(id);
    toast.success("Tipologia removida");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Produto Imobiliário" description="Mix de produto, tipologias e projeção de vendas" />

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-heading font-semibold text-foreground">Tipologias</h3>
          <Button size="sm" variant="outline" onClick={() => setAdding(!adding)} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 text-xs text-muted-foreground font-medium">Tipologia</th>
                <th className="text-right p-3 text-xs text-muted-foreground font-medium">Qtde</th>
                <th className="text-right p-3 text-xs text-muted-foreground font-medium">Área Priv.</th>
                <th className="text-right p-3 text-xs text-muted-foreground font-medium">Vagas</th>
                <th className="text-right p-3 text-xs text-muted-foreground font-medium">Preço Unid.</th>
                <th className="text-right p-3 text-xs text-muted-foreground font-medium">R$/m²</th>
                <th className="text-right p-3 text-xs text-muted-foreground font-medium">Vendáveis</th>
                <th className="text-right p-3 text-xs text-muted-foreground font-medium">Permuta</th>
                <th className="text-right p-3 text-xs text-muted-foreground font-medium">% VGV</th>
                <th className="text-center p-3 text-xs text-muted-foreground font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {adding && (
                <tr className="border-b border-border bg-accent/10">
                  <td className="p-2"><Input value={newUnit.name} onChange={e => setNewUnit({ ...newUnit, name: e.target.value })} placeholder="Nome" className="h-7 text-xs" /></td>
                  <td className="p-2"><Input type="number" value={newUnit.quantity} onChange={e => setNewUnit({ ...newUnit, quantity: e.target.value })} placeholder="0" className="h-7 text-xs text-right w-16" /></td>
                  <td className="p-2"><Input type="number" value={newUnit.privateArea} onChange={e => setNewUnit({ ...newUnit, privateArea: e.target.value })} placeholder="0" className="h-7 text-xs text-right w-16" /></td>
                  <td className="p-2"><Input type="number" value={newUnit.parkingSpots} onChange={e => setNewUnit({ ...newUnit, parkingSpots: e.target.value })} placeholder="0" className="h-7 text-xs text-right w-14" /></td>
                  <td className="p-2"><Input type="number" value={newUnit.unitPrice} onChange={e => setNewUnit({ ...newUnit, unitPrice: e.target.value })} placeholder="0" className="h-7 text-xs text-right w-24" /></td>
                  <td className="p-2 text-right text-xs text-muted-foreground">auto</td>
                  <td className="p-2 text-right text-xs text-muted-foreground">auto</td>
                  <td className="p-2"><Input type="number" value={newUnit.swappedUnits} onChange={e => setNewUnit({ ...newUnit, swappedUnits: e.target.value })} placeholder="0" className="h-7 text-xs text-right w-14" /></td>
                  <td className="p-2 text-right text-xs text-muted-foreground">auto</td>
                  <td className="p-2 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={handleAdd} className="text-emerald-400 hover:text-emerald-300 p-1"><Save className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setAdding(false)} className="text-destructive hover:text-destructive/80 p-1"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              )}
              {unitTypes.map(ut => (
                <tr key={ut.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  {editingId === ut.id ? (
                    <>
                      <td className="p-2"><Input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="h-7 text-xs" /></td>
                      <td className="p-2"><Input type="number" value={editData.quantity} onChange={e => setEditData({ ...editData, quantity: e.target.value })} className="h-7 text-xs text-right w-16" /></td>
                      <td className="p-2"><Input type="number" value={editData.privateArea} onChange={e => setEditData({ ...editData, privateArea: e.target.value })} className="h-7 text-xs text-right w-16" /></td>
                      <td className="p-2"><Input type="number" value={editData.parkingSpots} onChange={e => setEditData({ ...editData, parkingSpots: e.target.value })} className="h-7 text-xs text-right w-14" /></td>
                      <td className="p-2"><Input type="number" value={editData.unitPrice} onChange={e => setEditData({ ...editData, unitPrice: e.target.value })} className="h-7 text-xs text-right w-24" /></td>
                      <td className="p-2 text-right text-xs text-muted-foreground">auto</td>
                      <td className="p-2 text-right text-xs text-muted-foreground">auto</td>
                      <td className="p-2"><Input type="number" value={editData.swappedUnits} onChange={e => setEditData({ ...editData, swappedUnits: e.target.value })} className="h-7 text-xs text-right w-14" /></td>
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
                      <td className="p-3 font-medium text-foreground cursor-pointer" onClick={() => startEdit(ut.id)}>{ut.name}</td>
                      <td className="p-3 text-right text-foreground cursor-pointer" onClick={() => startEdit(ut.id)}>{ut.quantity}</td>
                      <td className="p-3 text-right text-foreground">{ut.privateArea} m²</td>
                      <td className="p-3 text-right text-foreground">{ut.parkingSpots}</td>
                      <td className="p-3 text-right text-foreground">{formatCurrency(ut.unitPrice)}</td>
                      <td className="p-3 text-right text-foreground">{formatCurrency(ut.pricePerSqm)}</td>
                      <td className="p-3 text-right text-foreground">{ut.sellableUnits}</td>
                      <td className="p-3 text-right text-foreground">{ut.swappedUnits}</td>
                      <td className="p-3 text-right text-primary font-medium">{formatPercent(ut.vgvShare)}</td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => startEdit(ut.id)} className="text-muted-foreground hover:text-foreground p-1"><Save className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleRemove(ut.id)} className="text-destructive/60 hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-4">VGV por Tipologia</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => (v / 1e6).toFixed(0) + "M"} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="VGV" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
