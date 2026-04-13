/**
 * AIAssistant v4 — Conectado ao ProjectContext real
 * Lê: indicators, enterprise, unitTypes, land, settings
 * Chama: /api/ai-chat (proxy Vercel — sem CORS)
 * Suporta: Chat + busca web · PDF · Imagens · Colar print (Ctrl+V)
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import {
  Sparkles, X, Send, Loader2, RefreshCw, User,
  Upload, AlertTriangle, CheckCircle2, XCircle,
  Globe, Paperclip, AlertCircle, Image,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// TEMA
// ─────────────────────────────────────────────────────────────
const T = {
  bg:"#030b1a", surf:"#061020", card:"#091428",
  border:"#0f1f3d", bBright:"#1a3560",
  gold:"#c9a227", goldL:"#f0c040", goldDim:"rgba(201,162,39,0.12)",
  greenL:"#34d399", greenDim:"rgba(4,120,87,0.12)",
  redL:"#f87171", redDim:"rgba(185,28,28,0.12)",
  blueL:"#60a5fa", amberL:"#fbbf24", amberDim:"rgba(180,83,9,0.12)",
  text:"#e2e8f0", sub:"#94a3b8", muted:"#475569",
};

// ─────────────────────────────────────────────────────────────
// CAMPOS MAPEADOS PARA AUTO-PREENCHIMENTO
// ─────────────────────────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  // Enterprise
  name: "Nome do Projeto", type: "Tipo de Empreendimento",
  city: "Cidade", state: "UF", neighborhood: "Bairro",
  standard: "Padrão do Produto", towers: "Número de Torres",
  floors: "Pavimentos", totalArea: "Área Total (m²)",
  privateArea: "Área Privativa (m²)", builtArea: "Área Construída (m²)",
  launchMonth: "Mês de Lançamento", constructionStart: "Início Obra (mês)",
  deliveryMonth: "Entrega (mês)", totalMonths: "Prazo Total (meses)",
  // Land
  landValue: "Valor do Terreno (R$)", itbi: "ITBI (%)",
  registrationCost: "Registro (%)", brokerageCost: "Corretagem (%)",
  dueDiligence: "Due Diligence (R$)", legalFees: "Honorários Jurídicos (R$)",
  soilInvestigation: "Sondagem (R$)",
  // Settings
  tma: "TMA (% a.a.)", incc: "INCC (% a.a.)", ipca: "IPCA (% a.a.)", cdi: "CDI (% a.a.)",
};

// ─────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────
const f$ = (v: any) => {
  if (v == null || isNaN(Number(v))) return "—";
  const n = Number(v), a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a >= 1e6) return `${s}R$${(a/1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}R$${(a/1e3).toFixed(0)}K`;
  return `${s}R$${a.toFixed(0)}`;
};
const fP = (v: any) => v != null ? `${(Number(v)*100).toFixed(1)}%` : "—";

// ─────────────────────────────────────────────────────────────
// CONTEXTO → TEXTO PARA A IA
// ─────────────────────────────────────────────────────────────
function buildContext(ctx: ReturnType<typeof useProject>): string {
  const { enterprise: e, indicators: ind, unitTypes, land, settings } = ctx;

  const vgv = unitTypes.reduce((a, u) => a + (u.quantity || 0) * (u.price || 0), 0);
  const totalUnits = unitTypes.reduce((a, u) => a + (u.quantity || 0), 0);

  return `
PROJETO ATUAL (tempo real):
Nome: ${e.name || "—"} | Tipo: ${e.type || "—"} | Padrão: ${e.standard || "—"}
Local: ${e.neighborhood || "—"}, ${e.city || "—"}/${e.state || "—"}
Torres: ${e.towers || "—"} | Pavimentos: ${e.floors || "—"}
Prazo: ${e.totalMonths || "—"} meses | Lançamento: M${e.launchMonth || 0} | Entrega: M${e.deliveryMonth || 0}

PRODUTO:
Total: ${totalUnits} unidades | VGV estimado: ${f$(vgv)}
${unitTypes.map(u => `  - ${u.name || u.type}: ${u.quantity}un × ${u.privateArea}m² × ${f$(u.price)}`).join("\n")}

TERRENO:
Valor: ${f$(land.landValue || land.value)} | ITBI: ${land.itbi || "—"}% | Corretagem: ${land.brokerageCost || land.brokerage || "—"}%

INDICADORES CALCULADOS:
VGV: ${f$(ind.vgv)} | Receita Líquida: ${f$(ind.netRevenue)}
Custo Total: ${f$(ind.totalCost)} | Lucro: ${f$(ind.netProfit)}
Margem VGV: ${fP(ind.vgvMargin ?? ind.grossMargin)} | Margem Líquida: ${fP(ind.netMargin)}
TIR: ${ind.irr != null ? fP(ind.irr) : "—"} | VPL: ${f$(ind.npv)}
Payback: ${ind.payback ?? "—"}m | ROI: ${fP(ind.roi)} | ROE: ${fP(ind.roe)}
Pico Caixa Negativo: ${f$(ind.maxNegativeCash ?? ind.maxCashExposure)}
Status: ${ind.status || "—"}

PARÂMETROS:
TMA: ${settings.tma} | INCC: ${settings.incc} | CDI: ${settings.cdi}
`.trim();
}

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────
const SYSTEM = `Você é especialista sênior em incorporação imobiliária no estado da Bahia e no Brasil (20+ anos).

DOMÍNIO: VGV, TIR, VPL, ROI, ROE, CUB SINDUSCON-BA, SINAPI, mercado baiano (Salvador, Feira de Santana, Ilhéus, Porto Seguro, Vitória da Conquista, Lauro de Freitas, Camaçari, litoral norte/sul, interior), tributação (RET, ISS, ITBI por município BA), Lei 4.591/64, Lei 6.766/79, NBR 12721, PDU municipal, SEDUR, SUCOM, CREA-BA, CAU-BA, AVCB, CEF, SFH, SFI, MCMV.

REGRAS:
1. Use busca web para CUB atual SINDUSCON-BA, leis recentes, ITBI por município, taxas vigentes
2. Cite a fonte ao usar busca web
3. Nunca invente números — se não souber, diga claramente
4. Valores ESPECÍFICOS com justificativa quando pedido
5. Considere logística e mercado regional do interior baiano
6. Recomendações claras com ressalvas para decisões de negócio
7. Linguagem técnica de incorporação — o usuário é profissional`;

const EXTRACTION_PROMPT = `Analise este arquivo/imagem e extraia dados imobiliários.

CAMPOS DISPONÍVEIS: ${Object.entries(FIELD_LABELS).map(([k,v])=>`${k}:${v}`).join(", ")}

RETORNE APENAS JSON PURO (sem markdown):
{"campos":{"landValue":{"valor":1500000,"confianca":0.95,"evidencia":"texto visto"},...},"tipologias":[{"nome":"2BR","areaPriv":65,"qtd":8,"vagas":1,"preco":620000,"confianca":0.9}],"nao_encontrado":["campo"],"alertas":["alerta"],"resumo":"O que encontrou"}

Confiança: 1.0=explícito, 0.8=claro, 0.6=inferido — abaixo de 0.6 NÃO inclua.`;

// ─────────────────────────────────────────────────────────────
// API PROXY
// ─────────────────────────────────────────────────────────────
async function callProxy({ messages, systemFull, useSearch = true, maxTokens = 1200 }: {
  messages: any[]; systemFull: string; useSearch?: boolean; maxTokens?: number;
}) {
  const body: any = {
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system: systemFull,
    messages,
  };
  if (useSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];

  const resp = await fetch("/api/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || err.error || `Erro HTTP ${resp.status}`);
  }

  const data = await resp.json();
  let text = "", usedSearch = false;
  if (data.content) {
    for (const b of data.content) {
      if (b.type === "text") text += b.text;
      if (b.type === "tool_use" && b.name === "web_search") usedSearch = true;
    }
  }
  return { text: text.trim(), usedSearch };
}

// ─────────────────────────────────────────────────────────────
// UTILS ARQUIVO
// ─────────────────────────────────────────────────────────────
async function fileToBase64(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}
const getMime = (f: File) => {
  if (f.type === "application/pdf" || f.name?.endsWith(".pdf")) return "application/pdf";
  if (f.type.startsWith("image/")) return f.type;
  const e = f.name?.split(".").pop()?.toLowerCase();
  return ({ png:"image/png", jpg:"image/jpeg", jpeg:"image/jpeg", webp:"image/webp", gif:"image/gif" } as any)[e!] || "image/png";
};
const isPdf = (f: File) => f.type === "application/pdf" || f.name?.toLowerCase().endsWith(".pdf");
const emptyFile = () => ({ name:"", type:"", status:"idle", progress:"", extractedFields:{} as any, tipologias:[] as any[], alerts:[] as string[], notFound:[] as string[], summary:"", fieldCount:0, preview:null as string|null });
const cColor = (c: number) => c >= 0.9 ? T.greenL : c >= 0.7 ? T.amberL : T.redL;
const cLabel = (c: number) => c >= 0.9 ? "Alta" : c >= 0.7 ? "Média" : "Baixa";

// ═══════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════
export default function AIAssistant() {
  // Lê tudo direto do ProjectContext — sem precisar de props
  const projectCtx = useProject();
  const { updateEnterprise, updateLand, updateSettings, setUnitTypes } = projectCtx;

  const [open, setOpen]     = useState(false);
  const [tab, setTab]       = useState("chat");
  const [msgs, setMsgs]     = useState<any[]>([]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [drag, setDrag]     = useState(false);
  const [fi, setFi]         = useState(emptyFile());
  const [showP, setShowP]   = useState(false);
  const [sel, setSel]       = useState<Record<string,boolean>>({});
  const [hint, setHint]     = useState(false);
  const botRef = useRef<HTMLDivElement>(null);
  const inRef  = useRef<HTMLTextAreaElement>(null);
  const fRef   = useRef<HTMLInputElement>(null);
  const mob    = typeof window !== "undefined" && window.innerWidth < 640;

  // Status do projeto para o badge
  const ind = projectCtx.indicators;
  const vgvMargin = (ind as any).vgvMargin ?? (ind as any).grossMargin;
  const irr = (ind as any).irr;
  const status = (ind as any).status ?? (vgvMargin < 0 ? "INVIÁVEL" : vgvMargin < 0.10 ? "ATENÇÃO" : vgvMargin < 0.18 ? "VIÁVEL" : "EXCELENTE");
  const statusColor = vgvMargin < 0 ? T.redL : vgvMargin < 0.10 ? T.amberL : vgvMargin < 0.18 ? T.blueL : T.greenL;

  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{ role:"assistant", ts:Date.now(), content:
        `Olá! Especialista em incorporação — **Bahia e Brasil**.\n\n` +
        `Analisei o projeto **${projectCtx.enterprise.name || "atual"}** em tempo real.\n\n` +
        `**💬 Chat + busca web** — CUB SINDUSCON-BA, ITBI por município, leis, PDU, SEDUR, CEF\n\n` +
        `**📎 Arquivo** — PDF ou imagem (JPG, PNG…)\n\n` +
        `**📋 Print** — pressione **Ctrl+V** para colar captura de tela\n\nO que precisa?`
      }]);
    }
  }, [open]);

  useEffect(() => { botRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs, loading]);
  useEffect(() => { if (!open) return; const t = setTimeout(() => setHint(true), 3000); return () => clearTimeout(t); }, [open]);

  // Ctrl+V → colar print
  useEffect(() => {
    if (!open) return;
    const fn = (e: ClipboardEvent) => {
      const img = Array.from(e.clipboardData?.items || []).find(it => it.type.startsWith("image/"));
      if (!img) return;
      e.preventDefault();
      const f = img.getAsFile();
      if (f) proc(new File([f], `print_${Date.now()}.png`, { type: f.type || "image/png" }), "print");
    };
    window.addEventListener("paste", fn as any);
    return () => window.removeEventListener("paste", fn as any);
  }, [open]);

  // ── ENVIAR MENSAGEM ────────────────────────────────────────
  const send = async (text?: string) => {
    const m = (text || input).trim();
    if (!m || loading) return;
    setInput("");
    const next = [...msgs, { role:"user", content:m, ts:Date.now() }];
    setMsgs(next);
    setLoading(true);
    try {
      const ctx = buildContext(projectCtx);
      const { text:rep, usedSearch } = await callProxy({
        messages: next.map(x => ({ role:x.role, content:x.content })),
        systemFull: `${SYSTEM}\n\n${ctx}`,
        useSearch: true,
      });
      setMsgs(p => [...p, { role:"assistant", content:rep || "Sem resposta.", ts:Date.now(), usedSearch }]);
    } catch(e: any) {
      setMsgs(p => [...p, { role:"assistant", content:`⚠️ **Erro:** ${e.message}`, ts:Date.now(), isError:true }]);
    }
    setLoading(false);
    setTimeout(() => inRef.current?.focus(), 100);
  };

  // ── PROCESSAR ARQUIVO ──────────────────────────────────────
  const proc = useCallback(async (f: File, origin = "upload") => {
    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    const isImg = f.type.startsWith("image/") || ["png","jpg","jpeg","webp","gif","bmp"].includes(ext);
    const pdf = isPdf(f);
    if (!isImg && !pdf) {
      setFi(p => ({ ...p, name:f.name, status:"error", error:`Formato .${ext} não suportado. Use PDF ou imagem.` }));
      setTab("arquivo"); return;
    }
    if (f.size > 12 * 1024 * 1024) {
      setFi(p => ({ ...p, name:f.name, status:"error", error:"Arquivo maior que 12MB." }));
      setTab("arquivo"); return;
    }
    if (origin === "print") setMsgs(p => [...p, { role:"user", content:"[Print colado — analisando…]", ts:Date.now(), isPrint:true }]);
    setFi({ ...emptyFile(), name:f.name, type:isImg?"imagem":"pdf", status:"parsing", progress:`Lendo ${isImg?"imagem":"PDF"}…` });
    setShowP(false); setTab("arquivo");
    try {
      const b64 = await fileToBase64(f);
      if (b64.length > 9 * 1024 * 1024) throw new Error("Arquivo muito grande após conversão. Reduza a resolução.");
      const mt = getMime(f);
      setFi(p => ({ ...p, progress:"Analisando com IA…" }));
      const blk = pdf
        ? { type:"document", source:{ type:"base64", media_type:"application/pdf", data:b64 } }
        : { type:"image", source:{ type:"base64", media_type:mt, data:b64 } };
      const { text:raw } = await callProxy({
        messages: [{ role:"user", content:[blk, { type:"text", text:EXTRACTION_PROMPT }] }],
        systemFull: "Extraia dados imobiliários. Retorne APENAS JSON puro.",
        useSearch: false, maxTokens: 2500,
      });
      let ex: any;
      try { ex = JSON.parse(raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim()); }
      catch { const m = raw.match(/\{[\s\S]+\}/); if (m) { try { ex = JSON.parse(m[0]); } catch { throw new Error("JSON inválido."); } } else throw new Error("Não foi possível extrair dados. Verifique se a imagem está nítida."); }
      const fields = ex.campos || {}, tips = ex.tipologias || [], alerts = ex.alertas || [], nf = ex.nao_encontrado || [];
      const cnt = Object.keys(fields).length;
      const init: Record<string,boolean> = {};
      Object.entries(fields).forEach(([k,d]:any) => { if (d.confianca >= 0.7 && FIELD_LABELS[k]) init[k] = true; });
      if (tips.length > 0) init["__tips__"] = true;
      setSel(init);
      setFi({ name:f.name, type:isImg?"imagem":"pdf", status:"done", extractedFields:fields, tipologias:tips, alerts, notFound:nf, summary:ex.resumo||"", fieldCount:cnt, preview:isImg?`data:${mt};base64,${b64}`:null });
      setShowP(true);
      if (origin === "print") setMsgs(p => { const l=[...p]; if(l[l.length-1]?.isPrint) l[l.length-1]={...l[l.length-1],content:`[Print — ${cnt} campos extraídos. Veja aba Arquivo.]`}; return l; });
    } catch(e: any) {
      setFi(p => ({ ...p, status:"error", error:e.message }));
      if (origin === "print") setMsgs(p => { const l=[...p]; if(l[l.length-1]?.isPrint) l[l.length-1]={...l[l.length-1],content:`[Print — ⚠️ ${e.message}]`}; return l; });
    }
  }, []);

  // ── APLICAR CAMPOS AO PROJETO ─────────────────────────────
  const apply = () => {
    if (!fi.extractedFields) return;
    const enterpriseUpdate: any = {};
    const landUpdate: any = {};
    const settingsUpdate: any = {};
    let newUnitTypes: any[] | null = null;

    Object.entries(sel).forEach(([k, v]) => {
      if (!v) return;
      if (k === "__tips__") {
        newUnitTypes = fi.tipologias.map((t: any, i: number) => ({
          id: `extracted-${Date.now()}-${i}`,
          name: t.nome || `Tipologia ${i+1}`,
          type: t.nome || `Tipologia ${i+1}`,
          quantity: Number(t.qtd) || 4,
          privateArea: Number(t.areaPriv) || 70,
          parkingSpaces: Number(t.vagas) || 1,
          price: Number(t.preco) || 500000,
          totalArea: Number(t.areaPriv) * 1.3 || 90,
        }));
        return;
      }
      const d = (fi.extractedFields as any)[k];
      if (!d) return;
      const val = d.valor;
      // Classifica o campo
      if (["name","type","city","state","neighborhood","standard","towers","floors","totalArea","privateArea","builtArea","launchMonth","constructionStart","deliveryMonth","totalMonths"].includes(k)) {
        enterpriseUpdate[k] = ["towers","floors","launchMonth","constructionStart","deliveryMonth","totalMonths","totalArea","privateArea","builtArea"].includes(k) ? Number(val) : val;
      } else if (["landValue","itbi","registrationCost","brokerageCost","dueDiligence","legalFees","soilInvestigation"].includes(k)) {
        landUpdate[k] = Number(val) || val;
      } else if (["tma","incc","ipca","cdi"].includes(k)) {
        settingsUpdate[k] = String(val);
      }
    });

    let applied = 0;
    if (Object.keys(enterpriseUpdate).length > 0) { updateEnterprise(enterpriseUpdate); applied++; }
    if (Object.keys(landUpdate).length > 0) { updateLand(landUpdate); applied++; }
    if (Object.keys(settingsUpdate).length > 0) { updateSettings(settingsUpdate); applied++; }
    if (newUnitTypes) { setUnitTypes(newUnitTypes); applied++; }

    if (applied === 0) { alert("Nenhum campo reconhecido para aplicar."); return; }

    setShowP(false);
    const lista = Object.keys(sel).filter(k => sel[k] && k !== "__tips__")
      .map(k => `- **${FIELD_LABELS[k]||k}:** ${(fi.extractedFields as any)[k]?.valor}`)
      .join("\n");
    const tipMsg = sel["__tips__"] ? `\n- **Tipologias:** ${fi.tipologias.length} tipos aplicados` : "";
    setMsgs(p => [...p, { role:"assistant", content:`✅ **Dados aplicados ao projeto:**\n${lista}${tipMsg}\n\nVerifique no dashboard — os indicadores já foram recalculados.`, ts:Date.now() }]);
    setTab("chat");
  };

  const drop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDrag(false); const f=e.dataTransfer.files[0]; if(f) proc(f); }, [proc]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} style={{
          position:"fixed", bottom:mob?84:24, right:20, zIndex:9999,
          width:52, height:52, borderRadius:"50%",
          background:`linear-gradient(135deg,${T.gold},${T.goldL})`,
          border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:`0 4px 24px rgba(201,162,39,0.5)`,
        }}>
          <Sparkles size={22} color="#030b1a"/>
        </button>
      )}

      {open && (
        <div style={{
          position:"fixed", bottom:mob?0:24, right:mob?0:20,
          width:mob?"100%":440, height:mob?"88vh":630,
          zIndex:9999, display:"flex", flexDirection:"column",
          background:T.card, border:`1px solid ${T.bBright}`,
          borderRadius:mob?"16px 16px 0 0":16,
          boxShadow:"0 20px 60px rgba(0,0,0,0.7)", overflow:"hidden",
          fontFamily:"Inter, sans-serif",
        }}>

          {/* Header */}
          <div style={{background:`linear-gradient(135deg,#091428,#0d1c38)`,borderBottom:`1px solid ${T.bBright}`,padding:"12px 14px",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${T.gold},${T.goldL})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Sparkles size={15} color="#030b1a"/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:T.text}}>IA Incorporação — Bahia e Brasil</div>
                <div style={{fontSize:10,color:T.goldL,display:"flex",alignItems:"center",gap:5}}>
                  <Globe size={9}/> Busca web · PDF · Imagens · Ctrl+V para print
                </div>
              </div>
              <button onClick={()=>{setMsgs([]);setFi(emptyFile());setShowP(false);}} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,padding:4}}><RefreshCw size={13}/></button>
              <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,padding:4}}><X size={16}/></button>
            </div>
            <div style={{display:"flex",gap:5,marginTop:10}}>
              {[{id:"chat",l:"Chat"},{id:"arquivo",l:fi.status==="done"?`Arquivo · ${fi.fieldCount} campos`:"Arquivo / Imagem"}].map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"6px",borderRadius:7,border:`1px solid ${tab===t.id?T.bBright:T.border}`,background:tab===t.id?T.bBright:"transparent",color:tab===t.id?T.text:T.muted,fontSize:11,fontWeight:600,cursor:"pointer"}}>{t.l}</button>
              ))}
            </div>
          </div>

          {/* CHAT */}
          {tab==="chat" && (
            <>
              <div style={{flex:1,overflowY:"auto",padding:"12px 12px 8px"}}>
                {/* Badge projeto */}
                <div style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",marginBottom:10,display:"flex",gap:8,alignItems:"center"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:statusColor}}/>
                  <div>
                    <div style={{fontSize:10,color:T.sub}}>{projectCtx.enterprise.name} · {projectCtx.enterprise.city}/{projectCtx.enterprise.state}</div>
                    <div style={{fontSize:11,color:T.text,fontWeight:600}}>
                      {status} · Margem {vgvMargin!=null?`${(vgvMargin*100).toFixed(1)}%`:"—"} · TIR {irr!=null?`${(irr*100).toFixed(1)}%`:"—"}
                    </div>
                  </div>
                </div>

                {/* Hint Ctrl+V */}
                {hint && msgs.length <= 1 && (
                  <div style={{background:`rgba(240,192,64,0.08)`,border:`1px dashed ${T.gold}66`,borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:11,color:T.goldL,display:"flex",alignItems:"center",gap:6}}>
                    <Image size={13}/> <span>Dica: pressione <strong>Ctrl+V</strong> para colar um print</span>
                  </div>
                )}

                {/* Sugestões */}
                {msgs.length <= 1 && (
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:9,color:T.muted,marginBottom:6,letterSpacing:"0.07em",textTransform:"uppercase"}}>Sugestões</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {[
                        "O projeto é viável? O que está fraco?",
                        "CUB alto padrão Bahia hoje",
                        "ITBI: alíquotas nos municípios da BA",
                        "Velocidade 3,5 un/mês é realista?",
                        "Financiamento CEF 2025 — requisitos",
                        "Lei 4.591/64 — obrigações do incorporador",
                        "Como funciona o RET?",
                        "Margem mínima para lançar?",
                        "Litoral baiano: onde há mais demanda?",
                        "Como negociar permuta de terreno?",
                        "O que é DSCR e qual benchmark?",
                        "SEDUR-BA: como é o licenciamento?",
                      ].map((sg,i) => (
                        <button key={i} onClick={() => send(sg)} style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:20,padding:"4px 9px",cursor:"pointer",fontSize:10,color:T.sub}}>{sg}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mensagens */}
                {msgs.map((m,i) => (
                  <div key={i} style={{display:"flex",flexDirection:m.role==="user"?"row-reverse":"row",gap:7,marginBottom:10,alignItems:"flex-start"}}>
                    <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,background:m.role==="user"?T.bBright:`linear-gradient(135deg,${T.gold},${T.goldL})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {m.role==="user" ? <User size={12} color={T.text}/> : <Sparkles size={12} color="#030b1a"/>}
                    </div>
                    <div style={{maxWidth:"83%"}}>
                      <div style={{background:m.role==="user"?T.bBright:T.surf,border:`1px solid ${m.role==="user"?T.bBright:T.border}`,borderRadius:m.role==="user"?"11px 11px 4px 11px":"11px 11px 11px 4px",padding:"9px 11px",fontSize:12,color:m.isError?T.amberL:T.text,lineHeight:1.65,whiteSpace:"pre-wrap"}}>
                        <Fmt text={m.content}/>
                      </div>
                      {m.usedSearch && <div style={{marginTop:3,fontSize:9,color:T.muted,display:"flex",alignItems:"center",gap:4}}><Globe size={9}/> Busca web</div>}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{display:"flex",gap:7,alignItems:"flex-start",marginBottom:10}}>
                    <div style={{width:26,height:26,borderRadius:"50%",background:`linear-gradient(135deg,${T.gold},${T.goldL})`,display:"flex",alignItems:"center",justifyContent:"center"}}><Sparkles size={12} color="#030b1a"/></div>
                    <div style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:"11px 11px 11px 4px",padding:"10px 14px",display:"flex",gap:4,alignItems:"center"}}>
                      {[0,1,2].map(i => <div key={i} style={{width:6,height:6,borderRadius:"50%",background:T.goldL,animation:`bounce 1.2s ${i*0.2}s infinite`}}/>)}
                    </div>
                  </div>
                )}
                <div ref={botRef}/>
              </div>

              {/* Input */}
              <div style={{padding:"9px 11px",borderTop:`1px solid ${T.border}`,background:T.surf,flexShrink:0}}>
                <div style={{display:"flex",gap:7,alignItems:"flex-end"}}>
                  <button onClick={() => fRef.current?.click()} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:8,padding:"8px",cursor:"pointer",color:T.muted,flexShrink:0,display:"flex"}}><Paperclip size={15}/></button>
                  <textarea ref={inRef} value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }}
                    placeholder="Pergunta ou Cole um print (Ctrl+V)…"
                    rows={1}
                    style={{flex:1,background:T.card,border:`1px solid ${T.border}`,borderRadius:9,padding:"9px 11px",color:T.text,fontSize:12,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.5,maxHeight:90,overflowY:"auto"}}
                    onFocus={e => e.target.style.borderColor=T.bBright}
                    onBlur={e => e.target.style.borderColor=T.border}
                  />
                  <button onClick={() => send()} disabled={loading || !input.trim()}
                    style={{width:36,height:36,borderRadius:9,border:"none",background:loading||!input.trim()?T.card:`linear-gradient(135deg,${T.gold},${T.goldL})`,cursor:loading||!input.trim()?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {loading ? <Loader2 size={14} color={T.muted} style={{animation:"spin 1s linear infinite"}}/> : <Send size={14} color={loading||!input.trim()?T.muted:"#030b1a"}/>}
                  </button>
                </div>
                <div style={{fontSize:9,color:T.muted,marginTop:4,textAlign:"center"}}>🌐 Busca web · 📎 PDF/Imagem · 📋 Ctrl+V · Enter envia</div>
              </div>
            </>
          )}

          {/* ARQUIVO */}
          {tab==="arquivo" && (
            <div style={{flex:1,overflowY:"auto",padding:"12px"}}>
              {(fi.status==="idle" || fi.status==="error") && (
                <>
                  <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={drop}
                    onClick={() => fRef.current?.click()}
                    style={{border:`2px dashed ${drag?T.goldL:T.border}`,borderRadius:12,padding:"24px 16px",textAlign:"center",cursor:"pointer",background:drag?T.goldDim:"transparent",marginBottom:12}}>
                    <Upload size={26} color={drag?T.goldL:T.muted} style={{marginBottom:8}}/>
                    <div style={{fontSize:13,fontWeight:600,color:drag?T.goldL:T.text,marginBottom:4}}>Arraste ou clique</div>
                    <div style={{fontSize:11,color:T.muted}}>PDF · PNG · JPG · WEBP · GIF · máx. 12MB</div>
                    <div style={{fontSize:10,color:T.goldL,marginTop:6}}>📋 Ou cole um print com Ctrl+V</div>
                  </div>

                  <div style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.goldL,marginBottom:8}}>O que posso extrair:</div>
                    {[
                      ["📊","Print de planilha/tabela","CUB, áreas, valores por tipologia"],
                      ["🏠","Foto de planta/memorial","Tipologias, áreas privativas, vagas"],
                      ["📄","PDF laudo de avaliação","Valor do terreno, área, localização"],
                      ["📝","PDF contrato/proposta","Valor, ITBI, corretagem, condições"],
                      ["🗺️","Print mapa/matrícula","Localização, área do terreno, lote"],
                    ].map(([e,t,d]) => (
                      <div key={t} style={{display:"flex",gap:8,marginBottom:7}}>
                        <span style={{fontSize:14}}>{e}</span>
                        <div><div style={{fontSize:11,fontWeight:600,color:T.text}}>{t}</div><div style={{fontSize:10,color:T.muted}}>{d}</div></div>
                      </div>
                    ))}
                    <div style={{marginTop:8,padding:"8px 10px",background:T.amberDim,border:`1px solid ${T.amberL}33`,borderRadius:7}}>
                      <div style={{fontSize:10,color:T.amberL,fontWeight:600,marginBottom:2}}>⚠️ Limitações:</div>
                      <div style={{fontSize:10,color:T.muted,lineHeight:1.5}}>Imagens escuras ou desfocadas têm baixa precisão. PDFs com senha não funcionam. Sempre revise antes de aplicar.</div>
                    </div>
                  </div>

                  {fi.status==="error" && (
                    <div style={{background:T.redDim,border:`1px solid ${T.redL}44`,borderRadius:10,padding:"12px 14px"}}>
                      <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                        <XCircle size={15} color={T.redL} style={{flexShrink:0,marginTop:2}}/>
                        <div><div style={{fontSize:12,fontWeight:700,color:T.redL,marginBottom:3}}>{fi.name}</div><div style={{fontSize:11,color:T.text}}>{(fi as any).error}</div></div>
                      </div>
                      <button onClick={() => setFi(emptyFile())} style={{marginTop:8,background:"transparent",border:`1px solid ${T.redL}44`,color:T.redL,borderRadius:7,padding:"5px 12px",cursor:"pointer",fontSize:11}}>Tentar outro</button>
                    </div>
                  )}
                </>
              )}

              {fi.status==="parsing" && (
                <div style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:10,padding:"24px",textAlign:"center"}}>
                  <Loader2 size={24} color={T.goldL} style={{animation:"spin 1s linear infinite",marginBottom:10}}/>
                  <div style={{fontSize:13,color:T.text,fontWeight:600}}>{fi.name}</div>
                  <div style={{fontSize:11,color:T.muted,marginTop:4}}>{fi.progress}</div>
                </div>
              )}

              {fi.status==="done" && showP && (
                <div>
                  {fi.preview && <div style={{marginBottom:10,borderRadius:10,overflow:"hidden",border:`1px solid ${T.border}`}}><img src={fi.preview} alt="Preview" style={{width:"100%",maxHeight:160,objectFit:"contain",background:T.surf,display:"block"}}/></div>}

                  <div style={{background:T.greenDim,border:`1px solid ${T.greenL}44`,borderRadius:10,padding:"11px 13px",marginBottom:10}}>
                    <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <CheckCircle2 size={14} color={T.greenL} style={{flexShrink:0,marginTop:2}}/>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:T.greenL}}>{fi.name}</div>
                        <div style={{fontSize:11,color:T.text,marginTop:3,lineHeight:1.5}}>{fi.summary}</div>
                        <div style={{fontSize:10,color:T.sub,marginTop:3}}>{fi.fieldCount} campos · {fi.tipologias.length} tipologias · {fi.notFound.length} não encontrados</div>
                      </div>
                    </div>
                  </div>

                  {fi.alerts.length > 0 && (
                    <div style={{background:T.amberDim,border:`1px solid ${T.amberL}44`,borderRadius:10,padding:"10px 13px",marginBottom:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:T.amberL,marginBottom:5,display:"flex",alignItems:"center",gap:5}}><AlertTriangle size={12}/>Atenção:</div>
                      {fi.alerts.map((a,i) => <div key={i} style={{fontSize:11,color:T.text,marginBottom:2}}>· {a}</div>)}
                    </div>
                  )}

                  <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:8}}>Selecione o que aplicar ao projeto:</div>

                  {fi.tipologias.length > 0 && (
                    <div style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div style={{fontSize:12,fontWeight:700,color:T.text}}>Tipologias ({fi.tipologias.length})</div>
                        <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}>
                          <input type="checkbox" checked={!!sel["__tips__"]} onChange={e => setSel(p=>({...p,"__tips__":e.target.checked}))} style={{accentColor:T.goldL}}/>
                          <span style={{fontSize:10,color:T.sub}}>Aplicar</span>
                        </label>
                      </div>
                      {fi.tipologias.map((t: any,i) => (
                        <div key={i} style={{fontSize:10,color:T.sub,padding:"4px 0",borderBottom:i<fi.tipologias.length-1?`1px solid ${T.border}`:"none"}}>
                          {t.nome} · {t.qtd}un · {t.areaPriv}m² · R${Number(t.preco||0).toLocaleString("pt-BR")} · {t.vagas}vg
                          <span style={{marginLeft:6,color:cColor(t.confianca),fontWeight:700}}>[{cLabel(t.confianca)} {(t.confianca*100).toFixed(0)}%]</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {Object.entries(fi.extractedFields).map(([key, data]: any) => {
                    if (!FIELD_LABELS[key]) return null;
                    const c = data.confianca, ok = c >= 0.7;
                    return (
                      <div key={key} style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",marginBottom:6,opacity:ok?1:0.55}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:10,color:T.sub}}>{FIELD_LABELS[key]}</div>
                            <div style={{fontSize:13,fontWeight:700,color:T.text,marginTop:1}}>{String(data.valor)}</div>
                            {data.evidencia && <div style={{fontSize:9,color:T.muted,marginTop:2,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={data.evidencia}>"{data.evidencia}"</div>}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                            <div style={{textAlign:"center"}}>
                              <div style={{fontSize:11,fontWeight:700,color:cColor(c)}}>{(c*100).toFixed(0)}%</div>
                              <div style={{fontSize:8,color:T.muted}}>{cLabel(c)}</div>
                            </div>
                            {ok
                              ? <input type="checkbox" checked={!!sel[key]} onChange={e => setSel(p=>({...p,[key]:e.target.checked}))} style={{accentColor:T.goldL,width:15,height:15,cursor:"pointer"}}/>
                              : <div title="Confiança < 70% — revise manualmente"><AlertCircle size={14} color={T.redL}/></div>
                            }
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {fi.notFound.length > 0 && (
                    <div style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",marginBottom:10}}>
                      <div style={{fontSize:10,color:T.muted,marginBottom:5}}>Não encontrado — preencha manualmente:</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {fi.notFound.map(f => <span key={f} style={{fontSize:9,color:T.muted,background:T.card,border:`1px solid ${T.border}`,borderRadius:4,padding:"2px 6px"}}>{FIELD_LABELS[f]||f}</span>)}
                      </div>
                    </div>
                  )}

                  <div style={{position:"sticky",bottom:0,background:T.card,paddingTop:10,borderTop:`1px solid ${T.border}`}}>
                    <div style={{display:"flex",gap:8,marginBottom:5}}>
                      <button onClick={() => { setFi(emptyFile()); setShowP(false); }} style={{flex:1,padding:"10px",borderRadius:9,border:`1px solid ${T.border}`,background:"transparent",color:T.sub,fontSize:12,cursor:"pointer",fontWeight:600}}>Cancelar</button>
                      <button onClick={apply} style={{flex:2,padding:"10px",borderRadius:9,border:"none",background:`linear-gradient(135deg,${T.gold},${T.goldL})`,color:"#030b1a",fontSize:12,cursor:"pointer",fontWeight:700}}>
                        ✓ Aplicar ({Object.values(sel).filter(Boolean).length})
                      </button>
                    </div>
                    <div style={{fontSize:9,color:T.muted,textAlign:"center"}}>Confiança ≥70% · Você confirma antes de aplicar</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <input ref={fRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,image/*,application/pdf"
        onChange={e => { if(e.target.files![0]){ proc(e.target.files![0]); e.target.value=""; } }}
        style={{display:"none"}}/>

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
        if (l.startsWith("## "))  return <div key={i} style={{fontSize:13,fontWeight:700,color:T.goldL,marginTop:i>0?8:0,marginBottom:3}}>{l.slice(3)}</div>;
        if (l.startsWith("### ")) return <div key={i} style={{fontSize:12,fontWeight:700,color:T.sub,marginTop:6,marginBottom:2}}>{l.slice(4)}</div>;
        if (l.startsWith("- ")||l.startsWith("• ")) return <div key={i} style={{display:"flex",gap:5,marginBottom:2}}><span style={{color:T.goldL}}>·</span><span style={{fontSize:12}}><B t={l.replace(/^[-•] /,"")}/></span></div>;
        if (l.trim()==="") return <div key={i} style={{height:5}}/>;
        return <div key={i} style={{fontSize:12,marginBottom:2}}><B t={l}/></div>;
      })}
    </div>
  );
}
function B({ t }: { t: string }) {
  return <>{t.split(/(\*\*[^*]+\*\*)/g).map((p,i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{color:T.text,fontWeight:700}}>{p.slice(2,-2)}</strong>
      : <span key={i}>{p}</span>
  )}</>;
}
