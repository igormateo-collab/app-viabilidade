import { useState, useRef, useEffect, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Sparkles, X, Send, Loader2, RefreshCw, User, Globe, Paperclip, Upload, CheckCircle2, XCircle, AlertTriangle, AlertCircle, Image } from "lucide-react";

const T = {
  bg: "#030b1a", surf: "#061020", card: "#091428",
  border: "#0f1f3d", bBright: "#1a3560",
  gold: "#c9a227", goldL: "#f0c040", goldDim: "rgba(201,162,39,0.12)",
  greenL: "#34d399", greenDim: "rgba(4,120,87,0.12)",
  redL: "#f87171", redDim: "rgba(185,28,28,0.12)",
  blueL: "#60a5fa", amberL: "#fbbf24", amberDim: "rgba(180,83,9,0.12)",
  text: "#e2e8f0", sub: "#94a3b8", muted: "#475569",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nome do Projeto", type: "Tipo de Empreendimento",
  city: "Cidade", state: "UF", neighborhood: "Bairro",
  standard: "Padrão do Produto", towers: "Número de Torres",
  floors: "Pavimentos", totalArea: "Área Total (m²)",
  privateArea: "Área Privativa (m²)", builtArea: "Área Construída (m²)",
  launchMonth: "Mês de Lançamento", constructionStart: "Início Obra (mês)",
  deliveryMonth: "Entrega (mês)", totalMonths: "Prazo Total (meses)",
  landValue: "Valor do Terreno (R$)", itbi: "ITBI (%)",
  registrationCost: "Registro (%)", brokerageCost: "Corretagem (%)",
  dueDiligence: "Due Diligence (R$)", legalFees: "Honorários Jurídicos (R$)",
  soilInvestigation: "Sondagem (R$)",
  tma: "TMA (% a.a.)", incc: "INCC (% a.a.)", ipca: "IPCA (% a.a.)", cdi: "CDI (% a.a.)",
};

const NUMERIC_FIELDS = new Set([
  "towers", "floors", "totalArea", "privateArea", "builtArea",
  "launchMonth", "constructionStart", "deliveryMonth", "totalMonths",
  "landValue", "itbi", "registrationCost", "brokerageCost",
  "dueDiligence", "legalFees", "soilInvestigation",
]);

function fmt(v: any): string {
  if (v == null || isNaN(Number(v))) return "—";
  const n = Number(v), a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a >= 1e6) return `${s}R$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}R$${(a / 1e3).toFixed(0)}K`;
  return `${s}R$${a.toFixed(0)}`;
}
function pct(v: any): string {
  return v != null ? `${(Number(v) * 100).toFixed(1)}%` : "—";
}

function buildCtx(ctx: ReturnType<typeof useProject>): string {
  const { enterprise: e, indicators: ind, unitTypes, land } = ctx;
  const vgv = unitTypes.reduce((a, u) => a + (u.quantity || 0) * (u.price || 0), 0);
  const nU = unitTypes.reduce((a, u) => a + (u.quantity || 0), 0);
  const vgvM = (ind as any).vgvMargin ?? (ind as any).grossMargin ?? 0;
  const irr = (ind as any).irr ?? null;
  return `PROJETO: ${e.name || "—"} | ${e.type || "—"} | ${e.standard || "—"}
Local: ${e.neighborhood || "—"}, ${e.city || "—"}/${e.state || "—"}
Unidades: ${nU} | VGV: ${fmt(vgv)} | Terreno: ${fmt((land as any).landValue || (land as any).value)}
Resultado: Margem ${pct(vgvM)} | TIR ${irr != null ? pct(irr) : "—"} | VPL ${fmt((ind as any).npv)} | Status: ${(ind as any).status || "—"}
${unitTypes.map(u => `  ${u.name || u.type}: ${u.quantity}un × ${u.privateArea}m² × ${fmt(u.price)}`).join("\n")}`;
}

const SYSTEM = `Você é especialista sênior em incorporação imobiliária no estado da Bahia e no Brasil (20+ anos).
DOMÍNIO: VGV, TIR, VPL, ROI, ROE, CUB SINDUSCON-BA, SINAPI, mercado baiano (Salvador, Feira de Santana, Ilhéus, Porto Seguro, Vitória da Conquista, Lauro de Freitas, Camaçari, litoral norte/sul, interior), tributação (RET, ISS, ITBI por município BA), Lei 4.591/64, Lei 6.766/79, NBR 12721, PDU municipal, SEDUR, SUCOM, CREA-BA, CEF, SFH, SFI, MCMV.
REGRAS: Nunca invente números. Valores específicos com justificativa. Linguagem técnica de incorporação.`;

const EXTRACTION_PROMPT = `Analise o conteúdo do documento abaixo e extraia dados imobiliários.
CAMPOS DISPONÍVEIS: ${Object.entries(FIELD_LABELS).map(([k, v]) => `${k}:${v}`).join(", ")}

REGRAS ESPECIAIS PARA AOP/SEDUR:
- Se encontrar "Área do Terreno", mapeie para "totalArea"
- Se encontrar CAM (Coeficiente de Aproveitamento Máximo), calcule builtArea = areaTerreno × CAM e mapeie para "builtArea"
- Se encontrar nome do requerente, mapeie para "name"
- Se encontrar bairro, mapeie para "neighborhood"
- Se encontrar cidade, mapeie para "city"

RETORNE APENAS JSON PURO (sem markdown):
{"campos":{"totalArea":{"valor":754,"confianca":0.99,"evidencia":"Área do Terreno: 754"},"builtArea":{"valor":2262,"confianca":0.95,"evidencia":"CAM=3,0 × 754m²"},"neighborhood":{"valor":"Luiz Anselmo","confianca":0.99,"evidencia":"Bairro: LUIZ ANSELMO"},...},"tipologias":[],"nao_encontrado":["campo"],"alertas":["alerta se houver"],"resumo":"Breve descrição"}
Confiança: 1.0=explícito, 0.8=calculado com evidência clara, 0.6=inferido.`;

// ── Extração de texto do PDF via pdf.js CDN ───────────────────
async function extractPdfText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedArray = new Uint8Array(e.target!.result as ArrayBuffer);

        // Carrega pdf.js do CDN
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          // Injeta o script se não estiver carregado
          await new Promise<void>((res, rej) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = () => {
              (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
              res();
            };
            script.onerror = rej;
            document.head.appendChild(script);
          });
        } else {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }

        const lib = (window as any).pdfjsLib;
        const pdf = await lib.getDocument({ data: typedArray }).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item: any) => item.str)
            .join(" ");
          fullText += `\n--- Página ${i} ---\n${pageText}`;
        }

        resolve(fullText.trim());
      } catch (err: any) {
        reject(new Error("Falha ao extrair texto do PDF: " + err.message));
      }
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo PDF."));
    reader.readAsArrayBuffer(file);
  });
}

// ── Converte imagem para base64 ───────────────────────────────
async function imageToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function getMime(file: File): string {
  if (file.type.startsWith("image/")) return file.type;
  const e = file.name.split(".").pop()?.toLowerCase() || "";
  return ({ png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" } as Record<string, string>)[e] || "image/png";
}

// ── Chamada ao proxy ──────────────────────────────────────────
async function callProxy(body: Record<string, any>): Promise<{ text: string }> {
  const resp = await fetch("/api/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error((err as any).error || `Erro HTTP ${resp.status}`);
  }
  const data = await resp.json();
  const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("") || "";
  return { text };
}

const cColor = (c: number) => c >= 0.9 ? T.greenL : c >= 0.7 ? T.amberL : T.redL;
const cLabel = (c: number) => c >= 0.9 ? "Alta" : c >= 0.7 ? "Média" : "Baixa";

interface Msg { role: string; content: string; ts: number; isError?: boolean; isPrint?: boolean; }
interface FileData {
  name: string; type: string; status: string; progress: string;
  extractedFields: Record<string, any>; tipologias: any[];
  alerts: string[]; notFound: string[]; summary: string;
  fieldCount: number; preview: string | null; error?: string;
}
const emptyFile = (): FileData => ({
  name: "", type: "", status: "idle", progress: "",
  extractedFields: {}, tipologias: [], alerts: [], notFound: [],
  summary: "", fieldCount: 0, preview: null,
});

export default function AIAssistant() {
  const ctx = useProject();
  const { updateEnterprise, updateLand, updateSettings, setUnitTypes } = ctx;

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("chat");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [fi, setFi] = useState<FileData>(emptyFile());
  const [showP, setShowP] = useState(false);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [hint, setHint] = useState(false);
  const botRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLTextAreaElement>(null);
  const fRef = useRef<HTMLInputElement>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  const ind = ctx.indicators;
  const vgvM = (ind as any).vgvMargin ?? (ind as any).grossMargin ?? 0;
  const irr = (ind as any).irr ?? null;
  const status = (ind as any).status || (vgvM < 0 ? "INVIÁVEL" : vgvM < 0.10 ? "ATENÇÃO" : vgvM < 0.18 ? "VIÁVEL" : "EXCELENTE");
  const statusColor = vgvM < 0 ? T.redL : vgvM < 0.10 ? T.amberL : vgvM < 0.18 ? T.blueL : T.greenL;

  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{
        role: "assistant", ts: Date.now(),
        content: `Olá! Especialista em incorporação — **Bahia e Brasil**.\n\nAnalisei o projeto **${ctx.enterprise.name || "atual"}** em tempo real.\n\n**💬 Chat** — leis, CUB, mercado, viabilidade\n\n**📎 Arquivo** — PDF (texto extraído automaticamente) ou imagem\n\n**📋 Print** — pressione **Ctrl+V** para colar\n\nO que precisa?`
      }]);
    }
  }, [open]);

  useEffect(() => { botRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);
  useEffect(() => { if (!open) return; const t = setTimeout(() => setHint(true), 3000); return () => clearTimeout(t); }, [open]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: ClipboardEvent) => {
      const img = Array.from(e.clipboardData?.items || []).find(it => it.type.startsWith("image/"));
      if (!img) return;
      e.preventDefault();
      const f = img.getAsFile();
      if (f) proc(new File([f], `print_${Date.now()}.png`, { type: f.type || "image/png" }), "print");
    };
    window.addEventListener("paste", fn as EventListener);
    return () => window.removeEventListener("paste", fn as EventListener);
  }, [open]);

  const send = async (text?: string) => {
    const m = (text || input).trim();
    if (!m || loading) return;
    setInput("");
    const next: Msg[] = [...msgs, { role: "user", content: m, ts: Date.now() }];
    setMsgs(next);
    setLoading(true);
    try {
      const { text: rep } = await callProxy({
        messages: next.map(x => ({ role: x.role, content: x.content })),
        system: `${SYSTEM}\n\n${buildCtx(ctx)}`,
        max_tokens: 1200,
      });
      setMsgs(p => [...p, { role: "assistant", content: rep || "Sem resposta.", ts: Date.now() }]);
    } catch (e: any) {
      setMsgs(p => [...p, { role: "assistant", content: `⚠️ **Erro:** ${e.message}`, ts: Date.now(), isError: true }]);
    }
    setLoading(false);
    setTimeout(() => inRef.current?.focus(), 100);
  };

  const proc = useCallback(async (f: File, origin = "upload") => {
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    const isImg = f.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext);
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");

    if (!isImg && !isPdf) {
      setFi({ ...emptyFile(), name: f.name, status: "error", error: `Formato .${ext} não suportado. Use PDF ou imagem (PNG, JPG…).` });
      setTab("arquivo"); return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setFi({ ...emptyFile(), name: f.name, status: "error", error: "Arquivo maior que 20MB." });
      setTab("arquivo"); return;
    }

    if (origin === "print") setMsgs(p => [...p, { role: "user", content: "[Print colado — analisando…]", ts: Date.now(), isPrint: true }]);
    setFi({ ...emptyFile(), name: f.name, type: isImg ? "imagem" : "pdf", status: "parsing", progress: isPdf ? "Extraindo texto do PDF…" : "Lendo imagem…" });
    setShowP(false); setTab("arquivo");

    try {
      let messageContent: any[];

      if (isPdf) {
        // Extrai texto do PDF via pdf.js — sem precisar de Gemini
        setFi(p => ({ ...p, progress: "Extraindo texto do PDF com pdf.js…" }));
        const pdfText = await extractPdfText(f);
        if (!pdfText || pdfText.length < 50) {
          throw new Error("PDF sem texto legível. Pode ser um PDF escaneado como imagem. Tente enviar como imagem (print do PDF).");
        }
        setFi(p => ({ ...p, progress: `Texto extraído (${pdfText.length} chars). Analisando com IA…` }));
        messageContent = [{
          type: "text",
          text: `CONTEÚDO DO DOCUMENTO "${f.name}":\n\n${pdfText.slice(0, 12000)}\n\n---\n${EXTRACTION_PROMPT}`
        }];
      } else {
        // Imagem — converte para base64 e envia via Gemini
        setFi(p => ({ ...p, progress: "Convertendo imagem…" }));
        const b64 = await imageToBase64(f);
        const mt = getMime(f);
        setFi(p => ({ ...p, progress: "Analisando imagem com IA…" }));
        messageContent = [
          { type: "image", source: { type: "base64", media_type: mt, data: b64 } },
          { type: "text", text: EXTRACTION_PROMPT }
        ];
      }

      const { text: raw } = await callProxy({
        messages: [{ role: "user", content: messageContent }],
        system: "Você extrai dados imobiliários de documentos brasileiros. Retorne APENAS JSON puro, sem markdown.",
        max_tokens: 2500,
      });

      // Parse JSON
      let ex: any;
      try {
        ex = JSON.parse(raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim());
      } catch {
        const m = raw.match(/\{[\s\S]+\}/);
        if (m) {
          try { ex = JSON.parse(m[0]); }
          catch { throw new Error("IA não retornou JSON válido. Tente novamente."); }
        } else {
          throw new Error("Não foi possível extrair dados estruturados do documento.");
        }
      }

      const fields = ex.campos || {}, tips = ex.tipologias || [], alerts = ex.alertas || [], nf = ex.nao_encontrado || [];
      const cnt = Object.keys(fields).length;
      const init: Record<string, boolean> = {};
      Object.entries(fields).forEach(([k, d]: any) => { if (d.confianca >= 0.7 && FIELD_LABELS[k]) init[k] = true; });
      if (tips.length > 0) init["__tips__"] = true;
      setSel(init);
      setFi({
        name: f.name, type: isImg ? "imagem" : "pdf", status: "done",
        extractedFields: fields, tipologias: tips, alerts, notFound: nf,
        summary: ex.resumo || "", fieldCount: cnt,
        preview: isImg ? URL.createObjectURL(f) : null,
      });
      setShowP(true);

      if (origin === "print") {
        setMsgs(p => {
          const l = [...p];
          if (l[l.length - 1]?.isPrint) l[l.length - 1] = { ...l[l.length - 1], content: `[Print — ${cnt} campos extraídos. Veja aba Arquivo.]` };
          return l;
        });
      }
    } catch (e: any) {
      setFi(p => ({ ...p, status: "error", error: e.message }));
      if (origin === "print") {
        setMsgs(p => {
          const l = [...p];
          if (l[l.length - 1]?.isPrint) l[l.length - 1] = { ...l[l.length - 1], content: `[Print — ⚠️ ${e.message}]` };
          return l;
        });
      }
    }
  }, []);

  const apply = () => {
    const eUp: Record<string, any> = {}, lUp: Record<string, any> = {}, sUp: Record<string, any> = {};
    let newTips: any[] | null = null;
    Object.entries(sel).forEach(([k, v]) => {
      if (!v) return;
      if (k === "__tips__") {
        newTips = fi.tipologias.map((t: any, i: number) => ({
          id: `ex-${Date.now()}-${i}`, name: t.nome || `Tip ${i + 1}`, type: t.nome || `Tip ${i + 1}`,
          quantity: Number(t.qtd) || 4, privateArea: Number(t.areaPriv) || 70,
          parkingSpaces: Number(t.vagas) || 1, price: Number(t.preco) || 500000,
          totalArea: (Number(t.areaPriv) || 70) * 1.3,
        }));
        return;
      }
      const d = fi.extractedFields[k]; if (!d) return;
      const val = d.valor;
      if (["name", "type", "city", "state", "neighborhood", "standard"].includes(k)) eUp[k] = val;
      else if (NUMERIC_FIELDS.has(k) && ["towers", "floors", "totalArea", "privateArea", "builtArea", "launchMonth", "constructionStart", "deliveryMonth", "totalMonths"].includes(k)) eUp[k] = Number(val);
      else if (["landValue", "itbi", "registrationCost", "brokerageCost", "dueDiligence", "legalFees", "soilInvestigation"].includes(k)) lUp[k] = Number(val) || val;
      else if (["tma", "incc", "ipca", "cdi"].includes(k)) sUp[k] = String(val);
    });
    let applied = 0;
    if (Object.keys(eUp).length) { updateEnterprise(eUp); applied++; }
    if (Object.keys(lUp).length) { updateLand(lUp); applied++; }
    if (Object.keys(sUp).length) { updateSettings(sUp); applied++; }
    if (newTips) { setUnitTypes(newTips); applied++; }
    if (!applied) { alert("Nenhum campo reconhecido para aplicar."); return; }
    setShowP(false);
    const lista = Object.keys(sel).filter(k => sel[k] && k !== "__tips__")
      .map(k => `- **${FIELD_LABELS[k] || k}:** ${fi.extractedFields[k]?.valor}`).join("\n");
    const tipMsg = sel["__tips__"] ? `\n- **Tipologias:** ${fi.tipologias.length} tipos aplicados` : "";
    setMsgs(p => [...p, { role: "assistant", content: `✅ **Aplicado:**\n${lista}${tipMsg}\n\nVerifique no dashboard.`, ts: Date.now() }]);
    setTab("chat");
  };

  const drop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0]; if (f) proc(f);
  }, [proc]);

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} style={{ position: "fixed", bottom: isMobile ? 84 : 24, right: 20, zIndex: 9999, width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg,${T.gold},${T.goldL})`, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 24px rgba(201,162,39,0.5)` }}>
          <Sparkles size={22} color="#030b1a" />
        </button>
      )}

      {open && (
        <div style={{ position: "fixed", bottom: isMobile ? 0 : 24, right: isMobile ? 0 : 20, width: isMobile ? "100%" : 440, height: isMobile ? "88vh" : 630, zIndex: 9999, display: "flex", flexDirection: "column", background: T.card, border: `1px solid ${T.bBright}`, borderRadius: isMobile ? "16px 16px 0 0" : 16, boxShadow: "0 20px 60px rgba(0,0,0,0.7)", overflow: "hidden", fontFamily: "Inter, sans-serif" }}>

          {/* Header */}
          <div style={{ background: "linear-gradient(135deg,#091428,#0d1c38)", borderBottom: `1px solid ${T.bBright}`, padding: "12px 14px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg,${T.gold},${T.goldL})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sparkles size={15} color="#030b1a" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>IA Incorporação — Bahia e Brasil</div>
                <div style={{ fontSize: 10, color: T.goldL, display: "flex", alignItems: "center", gap: 5 }}><Globe size={9} /> Chat · PDF · Imagens · Ctrl+V</div>
              </div>
              <button onClick={() => { setMsgs([]); setFi(emptyFile()); setShowP(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 4 }}><RefreshCw size={13} /></button>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 4 }}><X size={16} /></button>
            </div>
            <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
              {[{ id: "chat", l: "Chat" }, { id: "arquivo", l: fi.status === "done" ? `Arquivo · ${fi.fieldCount}` : "Arquivo / Imagem" }].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "6px", borderRadius: 7, border: `1px solid ${tab === t.id ? T.bBright : T.border}`, background: tab === t.id ? T.bBright : "transparent", color: tab === t.id ? T.text : T.muted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{t.l}</button>
              ))}
            </div>
          </div>

          {/* CHAT */}
          {tab === "chat" && (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 8px" }}>
                <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: statusColor }} />
                  <div>
                    <div style={{ fontSize: 10, color: T.sub }}>{ctx.enterprise.name} · {ctx.enterprise.city}/{ctx.enterprise.state}</div>
                    <div style={{ fontSize: 11, color: T.text, fontWeight: 600 }}>{status} · Margem {pct(vgvM)} · TIR {irr != null ? pct(irr) : "—"}</div>
                  </div>
                </div>

                {hint && msgs.length <= 1 && (
                  <div style={{ background: "rgba(240,192,64,0.08)", border: `1px dashed ${T.gold}66`, borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 11, color: T.goldL, display: "flex", alignItems: "center", gap: 6 }}>
                    <Image size={13} /> <span>Dica: pressione <strong>Ctrl+V</strong> para colar um print</span>
                  </div>
                )}

                {msgs.length <= 1 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: T.muted, marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" }}>Sugestões</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {["O projeto é viável?", "CUB alto padrão Bahia hoje", "ITBI nos municípios da BA", "Velocidade 3,5 un/mês é realista?", "Como funciona o RET?", "Margem mínima para lançar?", "Litoral baiano: maior demanda?", "Como negociar permuta?"].map((sg, i) => (
                        <button key={i} onClick={() => send(sg)} style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 20, padding: "4px 9px", cursor: "pointer", fontSize: 10, color: T.sub }}>{sg}</button>
                      ))}
                    </div>
                  </div>
                )}

                {msgs.map((m, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap: 7, marginBottom: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: m.role === "user" ? T.bBright : `linear-gradient(135deg,${T.gold},${T.goldL})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {m.role === "user" ? <User size={12} color={T.text} /> : <Sparkles size={12} color="#030b1a" />}
                    </div>
                    <div style={{ maxWidth: "83%" }}>
                      <div style={{ background: m.role === "user" ? T.bBright : T.surf, border: `1px solid ${m.role === "user" ? T.bBright : T.border}`, borderRadius: m.role === "user" ? "11px 11px 4px 11px" : "11px 11px 11px 4px", padding: "9px 11px", fontSize: 12, color: m.isError ? T.amberL : T.text, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                        <Fmt text={m.content} />
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{ display: "flex", gap: 7, alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg,${T.gold},${T.goldL})`, display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={12} color="#030b1a" /></div>
                    <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: "11px 11px 11px 4px", padding: "10px 14px", display: "flex", gap: 4, alignItems: "center" }}>
                      {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.goldL, animation: `bounce 1.2s ${i * 0.2}s infinite` }} />)}
                    </div>
                  </div>
                )}
                <div ref={botRef} />
              </div>

              <div style={{ padding: "9px 11px", borderTop: `1px solid ${T.border}`, background: T.surf, flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 7, alignItems: "flex-end" }}>
                  <button onClick={() => fRef.current?.click()} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px", cursor: "pointer", color: T.muted, flexShrink: 0, display: "flex" }}><Paperclip size={15} /></button>
                  <textarea ref={inRef} value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Pergunta ou Cole um print (Ctrl+V)…" rows={1}
                    style={{ flex: 1, background: T.card, border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 11px", color: T.text, fontSize: 12, resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.5, maxHeight: 90, overflowY: "auto" }}
                    onFocus={e => e.target.style.borderColor = T.bBright}
                    onBlur={e => e.target.style.borderColor = T.border}
                  />
                  <button onClick={() => send()} disabled={loading || !input.trim()}
                    style={{ width: 36, height: 36, borderRadius: 9, border: "none", background: loading || !input.trim() ? T.card : `linear-gradient(135deg,${T.gold},${T.goldL})`, cursor: loading || !input.trim() ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {loading ? <Loader2 size={14} color={T.muted} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} color={loading || !input.trim() ? T.muted : "#030b1a"} />}
                  </button>
                </div>
                <div style={{ fontSize: 9, color: T.muted, marginTop: 4, textAlign: "center" }}>📎 PDF/Imagem · 📋 Ctrl+V · Enter envia</div>
              </div>
            </>
          )}

          {/* ARQUIVO */}
          {tab === "arquivo" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
              {(fi.status === "idle" || fi.status === "error") && (
                <>
                  <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={drop}
                    onClick={() => fRef.current?.click()}
                    style={{ border: `2px dashed ${drag ? T.goldL : T.border}`, borderRadius: 12, padding: "24px 16px", textAlign: "center", cursor: "pointer", background: drag ? T.goldDim : "transparent", marginBottom: 12 }}>
                    <Upload size={26} color={drag ? T.goldL : T.muted} style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: drag ? T.goldL : T.text, marginBottom: 4 }}>Arraste ou clique</div>
                    <div style={{ fontSize: 11, color: T.muted }}>PDF (texto digital) · PNG · JPG · WEBP · máx. 20MB</div>
                    <div style={{ fontSize: 10, color: T.goldL, marginTop: 6 }}>📋 Ou cole um print com Ctrl+V</div>
                  </div>

                  <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.goldL, marginBottom: 8 }}>O que posso extrair:</div>
                    {[
                      ["📄", "AOP / SEDUR", "Área terreno, zona, CAB, CAM, recuos"],
                      ["📝", "Contrato / proposta", "Valor, ITBI, corretagem, condições"],
                      ["📊", "Print de planilha", "CUB, áreas, valores por tipologia"],
                      ["🏠", "Foto de planta", "Tipologias, áreas, vagas"],
                    ].map(([e, t, d]) => (
                      <div key={t} style={{ display: "flex", gap: 8, marginBottom: 7 }}>
                        <span style={{ fontSize: 14 }}>{e}</span>
                        <div><div style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{t}</div><div style={{ fontSize: 10, color: T.muted }}>{d}</div></div>
                      </div>
                    ))}
                    <div style={{ marginTop: 8, padding: "8px 10px", background: T.amberDim, border: `1px solid ${T.amberL}33`, borderRadius: 7 }}>
                      <div style={{ fontSize: 10, color: T.amberL, fontWeight: 600, marginBottom: 2 }}>⚠️ Limitações:</div>
                      <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.5 }}>PDFs escaneados (imagem) não têm texto — envie como imagem JPG/PNG. Sempre revise antes de aplicar.</div>
                    </div>
                  </div>

                  {fi.status === "error" && (
                    <div style={{ background: T.redDim, border: `1px solid ${T.redL}44`, borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <XCircle size={15} color={T.redL} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div><div style={{ fontSize: 12, fontWeight: 700, color: T.redL, marginBottom: 3 }}>{fi.name}</div><div style={{ fontSize: 11, color: T.text }}>{fi.error}</div></div>
                      </div>
                      <button onClick={() => setFi(emptyFile())} style={{ marginTop: 8, background: "transparent", border: `1px solid ${T.redL}44`, color: T.redL, borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 11 }}>Tentar outro</button>
                    </div>
                  )}
                </>
              )}

              {fi.status === "parsing" && (
                <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 10, padding: "24px", textAlign: "center" }}>
                  <Loader2 size={24} color={T.goldL} style={{ animation: "spin 1s linear infinite", marginBottom: 10 }} />
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{fi.name}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{fi.progress}</div>
                </div>
              )}

              {fi.status === "done" && showP && (
                <div>
                  {fi.preview && (
                    <div style={{ marginBottom: 10, borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}` }}>
                      <img src={fi.preview} alt="Preview" style={{ width: "100%", maxHeight: 160, objectFit: "contain", background: T.surf, display: "block" }} />
                    </div>
                  )}

                  <div style={{ background: T.greenDim, border: `1px solid ${T.greenL}44`, borderRadius: 10, padding: "11px 13px", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <CheckCircle2 size={14} color={T.greenL} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.greenL }}>{fi.name}</div>
                        <div style={{ fontSize: 11, color: T.text, marginTop: 3, lineHeight: 1.5 }}>{fi.summary}</div>
                        <div style={{ fontSize: 10, color: T.sub, marginTop: 3 }}>{fi.fieldCount} campos · {fi.tipologias.length} tipologias · {fi.notFound.length} não encontrados</div>
                      </div>
                    </div>
                  </div>

                  {fi.alerts.length > 0 && (
                    <div style={{ background: T.amberDim, border: `1px solid ${T.amberL}44`, borderRadius: 10, padding: "10px 13px", marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.amberL, marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}><AlertTriangle size={12} />Atenção:</div>
                      {fi.alerts.map((a, i) => <div key={i} style={{ fontSize: 11, color: T.text, marginBottom: 2 }}>· {a}</div>)}
                    </div>
                  )}

                  <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 8 }}>Selecione o que aplicar:</div>

                  {fi.tipologias.length > 0 && (
                    <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Tipologias ({fi.tipologias.length})</div>
                        <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                          <input type="checkbox" checked={!!sel["__tips__"]} onChange={e => setSel(p => ({ ...p, "__tips__": e.target.checked }))} style={{ accentColor: T.goldL }} />
                          <span style={{ fontSize: 10, color: T.sub }}>Aplicar</span>
                        </label>
                      </div>
                      {fi.tipologias.map((t: any, i: number) => (
                        <div key={i} style={{ fontSize: 10, color: T.sub, padding: "4px 0", borderBottom: i < fi.tipologias.length - 1 ? `1px solid ${T.border}` : "none" }}>
                          {t.nome} · {t.qtd}un · {t.areaPriv}m² · R${Number(t.preco || 0).toLocaleString("pt-BR")} · {t.vagas}vg
                          <span style={{ marginLeft: 6, color: cColor(t.confianca), fontWeight: 700 }}>[{cLabel(t.confianca)} {(t.confianca * 100).toFixed(0)}%]</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {Object.entries(fi.extractedFields).map(([key, data]: any) => {
                    if (!FIELD_LABELS[key]) return null;
                    const c = data.confianca, ok = c >= 0.7;
                    return (
                      <div key={key} style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 6, opacity: ok ? 1 : 0.55 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, color: T.sub }}>{FIELD_LABELS[key]}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginTop: 1 }}>{String(data.valor)}</div>
                            {data.evidencia && <div style={{ fontSize: 9, color: T.muted, marginTop: 2, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={data.evidencia}>"{data.evidencia}"</div>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: cColor(c) }}>{(c * 100).toFixed(0)}%</div>
                              <div style={{ fontSize: 8, color: T.muted }}>{cLabel(c)}</div>
                            </div>
                            {ok
                              ? <input type="checkbox" checked={!!sel[key]} onChange={e => setSel(p => ({ ...p, [key]: e.target.checked }))} style={{ accentColor: T.goldL, width: 15, height: 15, cursor: "pointer" }} />
                              : <div title="Confiança < 70%"><AlertCircle size={14} color={T.redL} /></div>
                            }
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {fi.notFound.length > 0 && (
                    <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 10 }}>
                      <div style={{ fontSize: 10, color: T.muted, marginBottom: 5 }}>Não encontrado:</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {fi.notFound.map(f => <span key={f} style={{ fontSize: 9, color: T.muted, background: T.card, border: `1px solid ${T.border}`, borderRadius: 4, padding: "2px 6px" }}>{FIELD_LABELS[f] || f}</span>)}
                      </div>
                    </div>
                  )}

                  <div style={{ position: "sticky", bottom: 0, background: T.card, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                      <button onClick={() => { setFi(emptyFile()); setShowP(false); }} style={{ flex: 1, padding: "10px", borderRadius: 9, border: `1px solid ${T.border}`, background: "transparent", color: T.sub, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Cancelar</button>
                      <button onClick={apply} style={{ flex: 2, padding: "10px", borderRadius: 9, border: "none", background: `linear-gradient(135deg,${T.gold},${T.goldL})`, color: "#030b1a", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                        ✓ Aplicar ({Object.values(sel).filter(Boolean).length})
                      </button>
                    </div>
                    <div style={{ fontSize: 9, color: T.muted, textAlign: "center" }}>Confiança ≥70% · Você confirma antes de aplicar</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <input ref={fRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,image/*,application/pdf"
        onChange={e => { if (e.target.files?.[0]) { proc(e.target.files[0]); e.target.value = ""; } }}
        style={{ display: "none" }} />

      <style>{`
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
    </>
  );
}

function Fmt({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div>
      {text.split("\n").map((l, i) => {
        if (l.startsWith("## ")) return <div key={i} style={{ fontSize: 13, fontWeight: 700, color: T.goldL, marginTop: i > 0 ? 8 : 0, marginBottom: 3 }}>{l.slice(3)}</div>;
        if (l.startsWith("### ")) return <div key={i} style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginTop: 6, marginBottom: 2 }}>{l.slice(4)}</div>;
        if (l.startsWith("- ") || l.startsWith("• ")) return <div key={i} style={{ display: "flex", gap: 5, marginBottom: 2 }}><span style={{ color: T.goldL }}>·</span><span style={{ fontSize: 12 }}><Bold t={l.replace(/^[-•] /, "")} /></span></div>;
        if (l.trim() === "") return <div key={i} style={{ height: 5 }} />;
        return <div key={i} style={{ fontSize: 12, marginBottom: 2 }}><Bold t={l} /></div>;
      })}
    </div>
  );
}
function Bold({ t }: { t: string }) {
  return <>{t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith("**") && p.endsWith("**") ? <strong key={i} style={{ color: T.text, fontWeight: 700 }}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>)}</>;
}
