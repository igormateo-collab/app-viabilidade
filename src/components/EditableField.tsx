import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Check, X } from "lucide-react";

interface EditableFieldProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
  type?: "text" | "number" | "select" | "date";
  options?: { label: string; value: string }[];
  suffix?: string;
}

export function EditableField({ label, value, onSave, type = "text", options, suffix }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0 gap-2">
        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
        <div className="flex items-center gap-1.5">
          {type === "select" && options ? (
            <Select value={draft} onValueChange={(v) => { setDraft(v); }}>
              <SelectTrigger className="h-7 text-xs w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              type={type === "number" ? "number" : type === "date" ? "date" : "text"}
              className="h-7 text-xs w-40"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
            />
          )}
          {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
          <button onClick={handleSave} className="text-success hover:text-success/80 p-0.5"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={handleCancel} className="text-destructive hover:text-destructive/80 p-0.5"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0 group cursor-pointer hover:bg-accent/20 rounded px-1 -mx-1 transition-colors" onClick={() => { setDraft(value); setEditing(true); }}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{value}{suffix ? ` ${suffix}` : ""}</span>
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}
