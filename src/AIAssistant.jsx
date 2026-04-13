/**
 * AIAssistant v3 — Especialista em Incorporação Imobiliária
 * Bahia (estado completo) e Brasil · PDF · Imagens (JPG, PNG, WEBP…) · Colar print
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, X, Send, Loader2, RefreshCw, User,
  Upload, AlertTriangle, CheckCircle2, XCircle,
  Globe, Paperclip, AlertCircle, Image, FileText
} from "lucide-react";

const T = {
  bg:"#030b1a",surf:"#061020",card:"#091428",
  border:"#0f1f3d",bBright:"#1a3560",
  gold:"#c9a227",goldL:"#f0c040",goldDim:"rgba(201,162,39,0.12)",
  greenL:"#34d399",greenDim:"rgba(4,120,87,0.12)",
  redL:"#f87171",redDim:"rgba(185,28,28,0.12)",
  blueL:"#60a5fa",amberL:"#fbbf24",amberDim:"rgba(180,83,9,0.12)",
  text:"#e2e8f0",sub:"#94a3b8",muted:"#475569",
};

const ACCEPTED_IMAGE_TYPES = ["image/png","image/jpeg","image/jpg","image/webp","image/gif"];
const ACCEPTED_EXTS        = ["pdf","png","jpg","jpeg","webp","gif","bmp"];

const FIELD_LABELS = {
  nome:"Nome do Projeto",empresa:"Empresa",spe:"SPE / Estrutura",
  cidade:"Cidade",uf:"UF",bairro:"Bairro",padrao:"Padrão do Produto",tipo:"Tipo de Empreendimento",
  torres:"Número de Torres",pavimentos:"Pavimentos",
  valorTerreno:"Valor do Terreno (R$)",areaTerreno:"Área do Terreno (m²)",areaConstruida:"Área Construída (m²)",
  itbi:"ITBI (%)",registro:"Registro (%)",corretagem:"Corretagem (%)",
  dueDigligence:"Due Diligence (R$)",honorariosJuridicos:"Honorários Jurídicos (R$)",
  sondagem:"Sondagem (R$)",demolicao:"Demolição (R$)",outrosAquisicao:"Outros Aquisição (R$)",
  cubBase:"CUB Base (R$/m²)",fatorPadrao:"Fator de Padrão (×)",contingencia:"Contingência (%)",
  projetos:"Projetos Executivos (R$)",aprovacoes:"Aprovações (R$)",gerenciamento:"Gerenciamento (R$)",
  adminObra:"Administração Obra (R$)",seguros:"Seguros (R$)",outrosIndiretos:"Outros Indiretos (R$)",
  comissaoVendas:"Comissão Vendas (%)",marketing:"Marketing (%)",
  standVendas:"Stand de Vendas (R$)",aptoDecorado:"Apto. Decorado (R$)",premiacaoComercial:"Premiação (R$)",
  descontoComercial:"Desconto Comercial (%)",distrato:"Distrato (%)",inadimplencia:"Inadimplência (%)",
  velocidadeVendas:"Velocidade de Vendas (un/mês)",aliquotaRET:"Alíquota RET (%)",
  percFinanciamento:"Financ. Produção (%)",taxaFinanciamento:"Taxa Financiamento (% a.a.)",
  mesLancamento:"Mês de Lançamento",mesInicioObra:"Início Obra (mês)",
  mesEntrega:"Entrega (mês)",prazoTotal:"Prazo Total (meses)",
  tma:"TMA (% a.a.)",cdi:"CDI (% a.a.)",incc:"INCC (% a.a.)",ipca:"IPCA (% a.a.)",
};

const NUMERIC_FIELDS = new Set([
  "valorTerreno","areaTerreno","areaConstruida","torres","pavimentos",
  "itbi","registro","corretagem","dueDigligence","honorariosJuridicos","sondagem",
  "demolicao","outrosAquisicao","cubBase","fatorPadrao","contingencia",
  "projetos","aprovacoes","gerenciamento","adminObra","seguros","outrosIndiretos",
  "comissaoVendas","marketing","standVendas","aptoDecorado","premiacaoComercial",
  "descontoComercial","distrato","inadimplencia","velocidadeVendas","aliquotaRET",
  "percFinanciamento","taxaFinanciamento","mesLancamento","mesInicioObra",
  "mesEntrega","prazoTotal","tma","cdi","incc","ipca",
]);

// ─────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────
const f$ = v => {
  if(v==null||isNaN(v)) return "—";
  const a=Math.abs(v),s=v<0?"-":"";
  if(a>=1e6) return `${s}R$${(a/1e6).toFixed(2)}M`;
  if(a>=1e3) return `${s}R$${(a/1e3).toFixed(0)}K`;
  return `${s}R$${a.toFixed(0)}`;
};
const fP = v => v!=null?`${(v*100).toFixed(1)}%`:"—";

// ─────────────────────────────────────────────────────────────
// CONTEXTO DO PROJETO
// ─────────────────────────────────────────────────────────────
function buildCtx(s,r) {
  if(!s||!r) return "";
  return `
## PROJETO ATUAL (tempo real)
**${s.nome}** | ${s.empresa} | ${s.spe}
Local: ${s.bairro}, ${s.cidade}/${s.uf} | Tipo: ${s.tipo} | Padrão: ${s.padrao}
Produto: ${r.nU} unidades | VGV ${f$(r.VGV)} | Ticket ${f$(r.ticketM)}
${s.tipologias?.map(t=>`  - ${t.nome}: ${t.qtd}un × ${t.areaPriv}m² × ${f$(t.preco)}`).join("\n")||""}
Custos: Terreno ${f$(r.custoTerreno)} | Obra ${f$(r.cObra)} | CUB ${r.cubEf?.toFixed(0)}R$/m² | Total ${f$(r.ct)}
Resultado: RL ${f$(r.rl)} | Lucro ${f$(r.lb)} | Margem ${fP(r.mVGV)} | ROI ${fP(r.roi)}
Financeiros: TIR ${r.tirA?fP(r.tirA):"—"} | VPL ${f$(r.VPL)} | Payback ${r.payback}m | Pico ${f$(r.expMax)}
Params: Vel.vendas ${s.velocidadeVendas}un/mês | RET ${s.aliquotaRET}% | TMA ${s.tma}% | CDI ${s.cdi}%
Status: **${r.status}** | Score ${r.score?.toFixed(0)}/100
`.trim();
}

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT — Bahia completa, sem restrição de cidade
// ─────────────────────────────────────────────────────────────
const SYSTEM = `Você é um especialista sênior em incorporação imobiliária no estado da Bahia e no Brasil, com 20+ anos de experiência.

DOMÍNIO TÉCNICO:
- Análise financeira: VGV, TIR, VPL, margem, ROI, ROE, payback, sensibilidade
- Custos: CUB (SINDUSCON-BA e nacional), SINAPI, BDI, encargos, padrões construtivos regionais da Bahia
- Mercado imobiliário baiano: Salvador, Feira de Santana, Ilhéus, Porto Seguro, Vitória da Conquista, Lauro de Freitas, Camaçari, litoral norte, sul e demais regiões do estado
- Tributação: RET (Lei 10.931/04), Lucro Presumido, Lucro Real, SPE, SCP, ISS municipal (varia por município baiano), ITBI (alíquotas por município), PIS/COFINS
- Legislação: Lei 4.591/64, Lei 6.766/79, ABNT NBR 12721, PDU dos municípios baianos, LUOS, plano diretor, código de obras municipal
- Regulamentação baiana: SEDUR (Secretaria de Desenvolvimento Urbano-BA), SUCOM (Salvador), CREA-BA, CAU-BA, AVCB, Corpo de Bombeiros-BA, Habite-se
- Financiamento: SBPE, SFH, SFI, CEF (MCMV, Pro-Cotista, Apoio à Produção), BB, Bradesco, Sicoob, cooperativas regionais
- Registros: cartórios baianos, registro de incorporação, registro de parcelamento, INCRA quando rural
- Ambiental: APA, IBAMA-BA, INEMA, licenciamento ambiental estadual e municipal

REGRAS CRÍTICAS:
1. Use busca web para CUB atual SINDUSCON-BA, leis recentes, taxas, IPTU, ITBI por município
2. CITE a fonte quando usar busca web (site, data se disponível)
3. NUNCA invente valores — se não souber, diga claramente
4. Dê valores ESPECÍFICOS com justificativa: "CUB padrão alto BA = R$X/m² (mês/ano, SINDUSCON-BA)"
5. Para municípios do interior da Bahia, leve em conta logística, mão de obra regional e mercado local
6. Para decisão de negócio, dê recomendação clara com ressalvas
7. Cite artigos quando relevante: "Art. 43 da Lei 4.591/64..."
8. O usuário é técnico — use linguagem de incorporação, não simplifique demais

Projeto atual do usuário:`;

// ─────────────────────────────────────────────────────────────
// PROMPT DE EXTRAÇÃO (para arquivos e imagens)
// ─────────────────────────────────────────────────────────────
const EXTRACTION_PROMPT = `Analise este arquivo/imagem e extraia dados para preencher um projeto de incorporação imobiliária.

CAMPOS DISPONÍVEIS:
${Object.entries(FIELD_LABELS).map(([k,v])=>`${k}: ${v}`).join("\n")}

INSTRUÇÕES:
- Retorne SOMENTE JSON puro, sem markdown, sem texto antes ou depois
- Confiança: 1.0=explícito e claro, 0.8=claro mas com pequena ambiguidade, 0.6=inferido com evidência — abaixo de 0.6 NÃO inclua
- Para tipologias extraia: nome, areaPriv (m²), qtd, vagas, preco (R$)
- "alertas": valores inconsistentes, fora do normal para o mercado baiano
- "nao_encontrado": campos importantes ausentes
- Se a imagem for ilegível ou sem dados imobiliários, informe no campo "resumo"

FORMATO (JSON puro):
{"campos":{"nome":{"valor":"...","confianca":0.95,"evidencia":"texto exato visto"},...},"tipologias":[{"nome":"...","areaPriv":70,"qtd":4,"vagas":1,"preco":500000,"confianca":0.9}],"nao_encontrado":["campo1"],"alertas":["alerta"],"resumo":"O que foi encontrado"}`;

// ─────────────────────────────────────────────────────────────
// LEITURA DE ARQUIVO COMO BASE64
// ─────────────────────────────────────────────────────────────
async function fileToBase64(file) {
  return new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=()=>res(r.result.split(",")[1]);
    r.onerror=rej;
    r.readAsDataURL(file);
  });
}

function getMediaType(file) {
  // PDF
  if(file.type==="application/pdf"||file.name?.toLowerCase().endsWith(".pdf")) return "application/pdf";
  // Imagens
  if(file.type.startsWith("image/")) return file.type;
  // Fallback por extensão
  const ext=file.name?.split(".").pop().toLowerCase();
  const map={png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",gif:"image/gif",bmp:"image/png"};
  return map[ext]||"image/png";
}

function isPDF(file) {
  return file.type==="application/pdf"||file.name?.toLowerCase().endsWith(".pdf");
}

// ─────────────────────────────────────────────────────────────
// CHAMADA À API
// ─────────────────────────────────────────────────────────────
async function callAPI({messages,systemFull,useSearch=true,maxTokens=1200}) {
  const body={
    model:"claude-sonnet-4-20250514",
    max_tokens:maxTokens,
    system:systemFull,
    messages,
  };
  if(useSearch) body.tools=[{type:"web_search_20250305",name:"web_search"}];
  const resp=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body),
  });
  if(!resp.ok){
    const err=await resp.json().catch(()=>({}));
    throw new Error(err.error?.message||`HTTP ${resp.status}`);
  }
  const data=await resp.json();
  let text="",usedSearch=false;
  if(data.content){
    for(const b of data.content){
      if(b.type==="text") text+=b.text;
      if(b.type==="tool_use"&&b.name==="web_search") usedSearch=true;
    }
  }
  return{text:text.trim(),usedSearch};
}

// ─────────────────────────────────────────────────────────────
// ESTADO DE ARQUIVO VAZIO
// ─────────────────────────────────────────────────────────────
const emptyFileState = () => ({name:"",type:"",status:"idle",progress:"",extractedFields:{},tipologias:[],alerts:[],notFound:[],summary:"",fieldCount:0,preview:null});

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function AIAssistant({s,r,onApplyFields}) {
  const [open,setOpen]       = useState(false);
  const [tab,setTab]         = useState("chat");
  const [msgs,setMsgs]       = useState([]);
  const [input,setInput]     = useState("");
  const [loading,setLoading] = useState(false);
  const [dragOver,setDragOver] = useState(false);
  const [fileState,setFileState] = useState(emptyFileState());
  const [showPreview,setShowPreview] = useState(false);
  const [fieldSel,setFieldSel] = useState({});
  const [pasteHint,setPasteHint] = useState(false); // hint de Ctrl+V
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const fileRef   = useRef(null);
  const panelRef  = useRef(null);
  const isMobile  = typeof window!=="undefined"&&window.innerWidth<640;

  // Boas-vindas
  useEffect(()=>{
    if(open&&msgs.length===0){
      setMsgs([{role:"assistant",content:`Olá! Sou seu especialista em incorporação imobiliária na **Bahia e no Brasil**.\n\nAnalisei o **${s?.nome||"projeto"}** em tempo real.\n\n**O que posso fazer:**\n\n**💬 Chat com busca web** — CUB SINDUSCON-BA, leis municipais, PDU, ITBI por município, financiamento CEF, SEDUR, SUCOM, mercado do interior e litoral baiano\n\n**📎 Enviar arquivos** — PDF ou imagem (JPG, PNG…)\n\n**📋 Colar print** — Cole qualquer captura de tela com **Ctrl+V** (ou toque longo no celular) direto no chat\n\nO que precisa?`,ts:Date.now()}]);
    }
  },[open]);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);

  // ── COLAR IMAGEM (Ctrl+V / paste) ──────────────────────────
  useEffect(()=>{
    if(!open) return;
    const handlePaste=(e)=>{
      const items=Array.from(e.clipboardData?.items||[]);
      const imgItem=items.find(it=>it.type.startsWith("image/"));
      if(!imgItem) return;
      e.preventDefault();
      const file=imgItem.getAsFile();
      if(file){
        // Cria um File com nome para identificação
        const named=new File([file],`print_${Date.now()}.png`,{type:file.type||"image/png"});
        processFile(named,"print");
      }
    };
    window.addEventListener("paste",handlePaste);
    return ()=>window.removeEventListener("paste",handlePaste);
  },[open]);

  // Mostrar hint de Ctrl+V após 3s
  useEffect(()=>{
    if(!open) return;
    const t=setTimeout(()=>setPasteHint(true),3000);
    return ()=>clearTimeout(t);
  },[open]);

  // ── CHAT ──────────────────────────────────────────────────────
  const sendMsg=async(text)=>{
    const userMsg=(text||input).trim();
    if(!userMsg||loading) return;
    setInput("");
    const newMsgs=[...msgs,{role:"user",content:userMsg,ts:Date.now()}];
    setMsgs(newMsgs);
    setLoading(true);
    try{
      const ctx=buildCtx(s,r);
      const {text:reply,usedSearch}=await callAPI({
        messages:newMsgs.map(m=>({role:m.role,content:m.content})),
        systemFull:`${SYSTEM}\n\n${ctx}`,
        useSearch:true,
      });
      setMsgs(p=>[...p,{role:"assistant",content:reply||"Sem resposta. Tente novamente.",ts:Date.now(),usedSearch}]);
    }catch(err){
      setMsgs(p=>[...p,{role:"assistant",content:`⚠️ **Erro:** ${err.message}`,ts:Date.now(),isError:true}]);
    }
    setLoading(false);
    setTimeout(()=>inputRef.current?.focus(),100);
  };

  // ── PROCESSAR ARQUIVO (PDF ou imagem) ───────────────────────
  const processFile=useCallback(async(file,origin="upload")=>{
    const ext=file.name.split(".").pop().toLowerCase();
    const isImg=file.type.startsWith("image/")||["png","jpg","jpeg","webp","gif","bmp"].includes(ext);
    const isPdf=isPDF(file);

    if(!isImg&&!isPdf){
      setFileState(p=>({...p,name:file.name,status:"error",error:`Formato .${ext} não suportado. Envie PDF ou imagem (PNG, JPG, WEBP, GIF).`}));
      setTab("arquivo");
      return;
    }
    if(file.size>12*1024*1024){
      setFileState(p=>({...p,name:file.name,status:"error",error:"Arquivo maior que 12MB. Reduza a imagem ou envie só as páginas relevantes."}));
      setTab("arquivo");
      return;
    }

    // Mostra mensagem de preview no chat se for print colado
    if(origin==="print"){
      setMsgs(p=>[...p,{role:"user",content:"[Print colado — analisando...]",ts:Date.now(),isImageMsg:true}]);
    }

    setFileState({...emptyFileState(),name:file.name,type:isImg?"imagem":"pdf",status:"parsing",progress:`Lendo ${isImg?"imagem":"PDF"}...`});
    setShowPreview(false);
    if(origin!=="print") setTab("arquivo");

    try{
      setFileState(p=>({...p,progress:"Convertendo para base64..."}));
      const b64=await fileToBase64(file);
      if(b64.length>8*1024*1024) throw new Error("Arquivo muito grande após conversão. Reduza a resolução da imagem.");

      const mt=getMediaType(file);
      setFileState(p=>({...p,progress:"Extraindo dados com IA (visão computacional)..."}));

      // Monta conteúdo da mensagem
      const fileBlock = isPdf
        ? {type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}}
        : {type:"image",  source:{type:"base64",media_type:mt,data:b64}};

      const {text:rawJson}=await callAPI({
        messages:[{role:"user",content:[fileBlock,{type:"text",text:EXTRACTION_PROMPT}]}],
        systemFull:"Você extrai dados de documentos e imagens imobiliários brasileiros. Retorne APENAS JSON puro, sem markdown, sem texto extra.",
        useSearch:false,
        maxTokens:2500,
      });

      // Parse JSON
      let extracted;
      try{
        const clean=rawJson.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
        extracted=JSON.parse(clean);
      }catch{
        const match=rawJson.match(/\{[\s\S]+\}/);
        if(match){try{extracted=JSON.parse(match[0]);}
        catch{throw new Error("IA não retornou dados estruturados. O arquivo pode estar ilegível, ser uma imagem muito escura/pequena, ou não conter dados imobiliários.");}}
        else throw new Error("Não foi possível extrair dados. Verifique se a imagem/PDF está nítido e contém informações de um empreendimento.");
      }

      const fields=extracted.campos||{};
      const tipologias=extracted.tipologias||[];
      const alerts=extracted.alertas||[];
      const notFound=extracted.nao_encontrado||[];
      const fieldCount=Object.keys(fields).length;

      const initSel={};
      Object.entries(fields).forEach(([k,d])=>{if(d.confianca>=0.7&&FIELD_LABELS[k])initSel[k]=true;});
      if(tipologias.length>0) initSel["__tipologias__"]=true;
      setFieldSel(initSel);

      setFileState({name:file.name,type:isImg?"imagem":"pdf",status:"done",extractedFields:fields,tipologias,alerts,notFound,summary:extracted.resumo||"",fieldCount,preview:isImg?`data:${mt};base64,${b64}`:null});
      setShowPreview(true);

      // Se veio de print colado, atualiza mensagem no chat
      if(origin==="print"){
        setMsgs(p=>{
          const last=[...p];
          if(last[last.length-1]?.isImageMsg) last[last.length-1]={...last[last.length-1],content:`[Print colado — ${fieldCount} campos extraídos. Veja a aba Arquivo.]`};
          return last;
        });
        setTab("arquivo");
      }

    }catch(err){
      setFileState(p=>({...p,status:"error",error:err.message}));
      if(origin==="print"){
        setMsgs(p=>{
          const last=[...p];
          if(last[last.length-1]?.isImageMsg) last[last.length-1]={...last[last.length-1],content:`[Print colado — ⚠️ ${err.message}]`};
          return last;
        });
      }
    }
  },[]);

  // ── APLICAR CAMPOS ───────────────────────────────────────────
  const applySelected=()=>{
    if(!fileState?.extractedFields||!onApplyFields) return;
    const toApply={};
    Object.entries(fieldSel).forEach(([k,sel])=>{
      if(!sel) return;
      if(k==="__tipologias__"){
        toApply.tipologias=fileState.tipologias.map((t,i)=>({
          id:Date.now()+i,
          nome:t.nome||`Tipologia ${i+1}`,
          areaPriv:Number(t.areaPriv)||70,
          qtd:Number(t.qtd)||4,
          vagas:Number(t.vagas)||1,
          preco:Number(t.preco)||500000,
        }));
      }else{
        const d=fileState.extractedFields[k];
        if(d) toApply[k]=NUMERIC_FIELDS.has(k)?Number(d.valor)||0:d.valor;
      }
    });
    if(Object.keys(toApply).length===0){alert("Selecione ao menos um campo.");return;}
    onApplyFields(toApply);
    setShowPreview(false);
    const lista=Object.keys(toApply).filter(k=>k!=="tipologias").map(k=>`- **${FIELD_LABELS[k]||k}:** ${toApply[k]}`).join("\n");
    const tipMsg=toApply.tipologias?`\n- **Tipologias:** ${toApply.tipologias.length} tipos aplicados`:"";
    setMsgs(p=>[...p,{role:"assistant",content:`✅ **Dados aplicados ao projeto:**\n${lista}${tipMsg}\n\nVerifique no dashboard. Me diga se algo estiver errado.`,ts:Date.now()}]);
    setTab("chat");
  };

  // ── DRAG & DROP ──────────────────────────────────────────────
  const handleDrop=useCallback(e=>{
    e.preventDefault();setDragOver(false);
    const file=e.dataTransfer.files[0];
    if(file) processFile(file);
  },[processFile]);

  const confColor=c=>c>=0.9?T.greenL:c>=0.7?T.amberL:T.redL;
  const confLabel=c=>c>=0.9?"Alta":c>=0.7?"Média":"Baixa";

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════
  return(
    <>
      {/* Botão flutuante */}
      {!open&&(
        <button onClick={()=>setOpen(true)} style={{
          position:"fixed",bottom:isMobile?84:24,right:20,zIndex:300,
          width:52,height:52,borderRadius:"50%",
          background:`linear-gradient(135deg,${T.gold},${T.goldL})`,
          border:"none",cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:`0 4px 24px rgba(201,162,39,0.5)`,
        }}>
          <Sparkles size={22} color="#030b1a"/>
        </button>
      )}

      {/* Painel */}
      {open&&(
        <div ref={panelRef} style={{
          position:"fixed",
          bottom:isMobile?0:24,right:isMobile?0:20,
          width:isMobile?"100%":440,height:isMobile?"88vh":630,
          zIndex:300,display:"flex",flexDirection:"column",
          background:T.card,border:`1px solid ${T.bBright}`,
          borderRadius:isMobile?"16px 16px 0 0":16,
          boxShadow:"0 20px 60px rgba(0,0,0,0.6)",overflow:"hidden",
        }}>

          {/* ── HEADER ── */}
          <div style={{background:`linear-gradient(135deg,#091428,#0d1c38)`,borderBottom:`1px solid ${T.bBright}`,padding:"12px 14px",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${T.gold},${T.goldL})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Sparkles size={15} color="#030b1a"/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:T.text}}>IA Incorporação — Bahia e Brasil</div>
                <div style={{fontSize:10,color:T.goldL,display:"flex",alignItems:"center",gap:5}}>
                  <Globe size={9}/> Busca web · PDF · Imagens · Colar print (Ctrl+V)
                </div>
              </div>
              <button onClick={()=>{setMsgs([]);setFileState(emptyFileState());setShowPreview(false);}} title="Nova conversa" style={{background:"none",border:"none",cursor:"pointer",color:T.muted,padding:4}}><RefreshCw size={13}/></button>
              <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,padding:4}}><X size={16}/></button>
            </div>
            <div style={{display:"flex",gap:5,marginTop:10}}>
              {[
                {id:"chat",label:"Chat"},
                {id:"arquivo",label:fileState.status==="done"?`Arquivo · ${fileState.fieldCount} campos`:"Arquivo / Imagem"},
              ].map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"6px",borderRadius:7,border:`1px solid ${tab===t.id?T.bBright:T.border}`,background:tab===t.id?T.bBright:"transparent",color:tab===t.id?T.text:T.muted,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── ABA CHAT ── */}
          {tab==="chat"&&(
            <>
              <div style={{flex:1,overflowY:"auto",padding:"12px 12px 8px"}}>
                {r&&(
                  <div style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",marginBottom:10,display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:r.mVGV<0?T.redL:r.mVGV<0.10?T.amberL:r.mVGV<0.18?T.blueL:T.greenL}}/>
                    <div>
                      <div style={{fontSize:10,color:T.sub}}>{s?.nome} · {s?.cidade}/{s?.uf}</div>
                      <div style={{fontSize:11,color:T.text,fontWeight:600}}>
                        {r.status} · Margem {r.mVGV!=null?`${(r.mVGV*100).toFixed(1)}%`:"—"} · TIR {r.tirA?`${(r.tirA*100).toFixed(1)}%`:"—"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Hint Ctrl+V */}
                {pasteHint&&msgs.length<=1&&(
                  <div style={{background:`rgba(240,192,64,0.08)`,border:`1px dashed ${T.gold}66`,borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:11,color:T.goldL,display:"flex",alignItems:"center",gap:6}}>
                    <Image size={13}/>
                    <span>Dica: pressione <strong>Ctrl+V</strong> para colar um print diretamente no chat</span>
                  </div>
                )}

                {/* Sugestões */}
                {msgs.length<=1&&(
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:9,color:T.muted,marginBottom:6,letterSpacing:"0.07em",textTransform:"uppercase"}}>Perguntas frequentes</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {[
                        "O projeto é viável? O que está fraco?",
                        "CUB alto padrão Bahia hoje",
                        "ITBI: quanto cobram nos municípios da BA?",
                        "Velocidade de 3,5 un/mês é realista?",
                        "Requisitos financiamento CEF 2025",
                        "Lei 4.591/64 — obrigações do incorporador",
                        "Como funciona o RET na incorporação?",
                        "Margem mínima para lançar?",
                        "O que é DSCR e qual benchmark?",
                        "Permuta: como negociar com proprietário do terreno?",
                        "Litoral baiano: quais municípios com maior demanda?",
                        "SEDUR-BA: como funciona o licenciamento?",
                      ].map((sg,i)=>(
                        <button key={i} onClick={()=>sendMsg(sg)} style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:20,padding:"4px 9px",cursor:"pointer",fontSize:10,color:T.sub}}>
                          {sg}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mensagens */}
                {msgs.map((msg,i)=>(
                  <div key={i} style={{display:"flex",flexDirection:msg.role==="user"?"row-reverse":"row",gap:7,marginBottom:10,alignItems:"flex-start"}}>
                    <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,background:msg.role==="user"?T.bBright:`linear-gradient(135deg,${T.gold},${T.goldL})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {msg.role==="user"?<User size={12} color={T.text}/>:<Sparkles size={12} color="#030b1a"/>}
                    </div>
                    <div style={{maxWidth:"83%"}}>
                      <div style={{background:msg.role==="user"?T.bBright:T.surf,border:`1px solid ${msg.role==="user"?T.bBright:T.border}`,borderRadius:msg.role==="user"?"11px 11px 4px 11px":"11px 11px 11px 4px",padding:"9px 11px",fontSize:12,color:msg.isError?T.amberL:T.text,lineHeight:1.65,whiteSpace:"pre-wrap"}}>
                        <FormattedMessage text={msg.content}/>
                      </div>
                      {msg.usedSearch&&(
                        <div style={{marginTop:3,fontSize:9,color:T.muted,display:"flex",alignItems:"center",gap:4}}>
                          <Globe size={9}/> Busca web em tempo real
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading&&(
                  <div style={{display:"flex",gap:7,alignItems:"flex-start",marginBottom:10}}>
                    <div style={{width:26,height:26,borderRadius:"50%",background:`linear-gradient(135deg,${T.gold},${T.goldL})`,display:"flex",alignItems:"center",justifyContent:"center"}}><Sparkles size={12} color="#030b1a"/></div>
                    <div style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:"11px 11px 11px 4px",padding:"10px 14px",display:"flex",gap:4,alignItems:"center"}}>
                      {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:T.goldL,animation:`bounce 1.2s ${i*0.2}s infinite`}}/>)}
                    </div>
                  </div>
                )}
                <div ref={bottomRef}/>
              </div>

              {/* Input */}
              <div style={{padding:"9px 11px",borderTop:`1px solid ${T.border}`,background:T.surf,flexShrink:0}}>
                <div style={{display:"flex",gap:7,alignItems:"flex-end"}}>
                  <button onClick={()=>fileRef.current?.click()} title="Enviar PDF ou imagem"
                    style={{background:"none",border:`1px solid ${T.border}`,borderRadius:8,padding:"8px",cursor:"pointer",color:T.muted,flexShrink:0,display:"flex",alignItems:"center"}}>
                    <Paperclip size={15}/>
                  </button>
                  <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}}
                    placeholder="Pergunta, ou Cole um print com Ctrl+V…"
                    rows={1}
                    style={{flex:1,background:T.card,border:`1px solid ${T.border}`,borderRadius:9,padding:"9px 11px",color:T.text,fontSize:12,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.5,maxHeight:90,overflowY:"auto"}}
                    onFocus={e=>e.target.style.borderColor=T.bBright}
                    onBlur={e=>e.target.style.borderColor=T.border}
                  />
                  <button onClick={()=>sendMsg()} disabled={loading||!input.trim()}
                    style={{width:36,height:36,borderRadius:9,border:"none",background:loading||!input.trim()?T.card:`linear-gradient(135deg,${T.gold},${T.goldL})`,cursor:loading||!input.trim()?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {loading?<Loader2 size={14} color={T.muted} style={{animation:"spin 1s linear infinite"}}/>:<Send size={14} color={loading||!input.trim()?T.muted:"#030b1a"}/>}
                  </button>
                </div>
                <div style={{fontSize:9,color:T.muted,marginTop:4,textAlign:"center"}}>
                  🌐 Busca web · 📎 PDF/Imagem · 📋 Ctrl+V para colar print · Enter envia
                </div>
              </div>
            </>
          )}

          {/* ── ABA ARQUIVO / IMAGEM ── */}
          {tab==="arquivo"&&(
            <div style={{flex:1,overflowY:"auto",padding:"12px"}}>

              {/* Upload zone (quando sem arquivo ou com erro) */}
              {(fileState.status==="idle"||fileState.status==="error")&&(
                <>
                  <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
                    onClick={()=>fileRef.current?.click()}
                    style={{border:`2px dashed ${dragOver?T.goldL:T.border}`,borderRadius:12,padding:"24px 16px",textAlign:"center",cursor:"pointer",background:dragOver?T.goldDim:"transparent",transition:"all .2s",marginBottom:12}}>
                    <Upload size={26} color={dragOver?T.goldL:T.muted} style={{marginBottom:8}}/>
                    <div style={{fontSize:13,fontWeight:600,color:dragOver?T.goldL:T.text,marginBottom:4}}>Arraste ou clique para enviar</div>
                    <div style={{fontSize:11,color:T.muted}}>PDF · PNG · JPG · WEBP · GIF · máx. 12MB</div>
                    <div style={{fontSize:10,color:T.goldL,marginTop:6}}>📋 Ou cole um print com Ctrl+V em qualquer lugar</div>
                  </div>

                  {/* Exemplos */}
                  <div style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.goldL,marginBottom:8}}>O que posso extrair:</div>
                    {[
                      {e:"📊",t:"Print de planilha / tabela",d:"CUB, áreas, valores por tipologia"},
                      {e:"🏠",t:"Foto de planta / memorial",d:"Tipologias, áreas privativas, vagas"},
                      {e:"📄",t:"PDF de laudo de avaliação",d:"Valor do terreno, área, localização"},
                      {e:"📝",t:"PDF de contrato / proposta",d:"Valor, condições, ITBI, corretagem"},
                      {e:"🗺️",t:"Print de mapa / matrícula",d:"Localização, área do terreno, lote"},
                      {e:"📋",t:"PDF de cronograma",d:"Prazos, marcos, etapas da obra"},
                    ].map(item=>(
                      <div key={item.t} style={{display:"flex",gap:8,marginBottom:7}}>
                        <span style={{fontSize:14}}>{item.e}</span>
                        <div><div style={{fontSize:11,fontWeight:600,color:T.text}}>{item.t}</div><div style={{fontSize:10,color:T.muted}}>{item.d}</div></div>
                      </div>
                    ))}
                    <div style={{marginTop:8,padding:"8px 10px",background:T.amberDim,border:`1px solid ${T.amberL}33`,borderRadius:7}}>
                      <div style={{fontSize:10,color:T.amberL,fontWeight:600,marginBottom:3}}>⚠️ Limitações honestas:</div>
                      <div style={{fontSize:10,color:T.muted,lineHeight:1.5}}>
                        Imagens muito escuras ou desfocadas têm baixa precisão. PDFs protegidos com senha não funcionam. PDFs escaneados sem OCR são lidos visualmente (menos preciso que texto digital). Sempre revise antes de aplicar.
                      </div>
                    </div>
                  </div>

                  {/* Erro */}
                  {fileState.status==="error"&&(
                    <div style={{background:T.redDim,border:`1px solid ${T.redL}44`,borderRadius:10,padding:"12px 14px"}}>
                      <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                        <XCircle size={15} color={T.redL} style={{flexShrink:0,marginTop:2}}/>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:T.redL,marginBottom:3}}>{fileState.name}</div>
                          <div style={{fontSize:11,color:T.text,lineHeight:1.5}}>{fileState.error}</div>
                        </div>
                      </div>
                      <button onClick={()=>setFileState(emptyFileState())} style={{marginTop:8,background:"transparent",border:`1px solid ${T.redL}44`,color:T.redL,borderRadius:7,padding:"5px 12px",cursor:"pointer",fontSize:11,fontWeight:600}}>
                        Tentar outro arquivo
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Processando */}
              {fileState.status==="parsing"&&(
                <div style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:10,padding:"24px",textAlign:"center"}}>
                  <Loader2 size={24} color={T.goldL} style={{animation:"spin 1s linear infinite",marginBottom:10}}/>
                  <div style={{fontSize:13,color:T.text,fontWeight:600}}>{fileState.name}</div>
                  <div style={{fontSize:11,color:T.muted,marginTop:4}}>{fileState.progress}</div>
                  <div style={{fontSize:10,color:T.muted,marginTop:8}}>Usando visão computacional da IA — sem busca web para garantir precisão sobre o conteúdo do arquivo.</div>
                </div>
              )}

              {/* Prévia da extração */}
              {fileState.status==="done"&&showPreview&&(
                <div>
                  {/* Preview da imagem (se for imagem) */}
                  {fileState.preview&&(
                    <div style={{marginBottom:10,borderRadius:10,overflow:"hidden",border:`1px solid ${T.border}`}}>
                      <img src={fileState.preview} alt="Preview" style={{width:"100%",maxHeight:160,objectFit:"contain",background:T.surf,display:"block"}}/>
                    </div>
                  )}

                  {/* Resumo */}
                  <div style={{background:T.greenDim,border:`1px solid ${T.greenL}44`,borderRadius:10,padding:"11px 13px",marginBottom:10}}>
                    <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <CheckCircle2 size={14} color={T.greenL} style={{flexShrink:0,marginTop:2}}/>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:T.greenL}}>{fileState.name}</div>
                        <div style={{fontSize:11,color:T.text,marginTop:3,lineHeight:1.5}}>{fileState.summary}</div>
                        <div style={{fontSize:10,color:T.sub,marginTop:3}}>
                          {fileState.fieldCount} campos · {fileState.tipologias.length} tipologias · {fileState.notFound.length} não encontrados
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alertas */}
                  {fileState.alerts.length>0&&(
                    <div style={{background:T.amberDim,border:`1px solid ${T.amberL}44`,borderRadius:10,padding:"10px 13px",marginBottom:10}}>
                      <div style={{fontSize:11,fontWeight:700,color:T.amberL,marginBottom:5,display:"flex",alignItems:"center",gap:5}}>
                        <AlertTriangle size={12}/>Atenção:
                      </div>
                      {fileState.alerts.map((a,i)=><div key={i} style={{fontSize:11,color:T.text,marginBottom:2}}>· {a}</div>)}
                    </div>
                  )}

                  <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:8}}>Selecione o que aplicar ao projeto:</div>

                  {/* Tipologias */}
                  {fileState.tipologias.length>0&&(
                    <div style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div style={{fontSize:12,fontWeight:700,color:T.text}}>Tipologias ({fileState.tipologias.length})</div>
                        <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}>
                          <input type="checkbox" checked={!!fieldSel["__tipologias__"]} onChange={e=>setFieldSel(p=>({...p,"__tipologias__":e.target.checked}))} style={{accentColor:T.goldL}}/>
                          <span style={{fontSize:10,color:T.sub}}>Aplicar</span>
                        </label>
                      </div>
                      {fileState.tipologias.map((t,i)=>(
                        <div key={i} style={{fontSize:10,color:T.sub,padding:"4px 0",borderBottom:i<fileState.tipologias.length-1?`1px solid ${T.border}`:"none"}}>
                          {t.nome} · {t.qtd}un · {t.areaPriv}m² · R${Number(t.preco||0).toLocaleString("pt-BR")} · {t.vagas}vg
                          <span style={{marginLeft:6,color:confColor(t.confianca),fontWeight:700}}>[{confLabel(t.confianca)} {(t.confianca*100).toFixed(0)}%]</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Campos */}
                  {Object.entries(fileState.extractedFields).map(([key,data])=>{
                    if(!FIELD_LABELS[key]) return null;
                    const c=data.confianca;
                    const ok=c>=0.7;
                    return(
                      <div key={key} style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",marginBottom:6,opacity:ok?1:0.55}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:10,color:T.sub}}>{FIELD_LABELS[key]}</div>
                            <div style={{fontSize:13,fontWeight:700,color:T.text,marginTop:1}}>{String(data.valor)}</div>
                            {data.evidencia&&<div style={{fontSize:9,color:T.muted,marginTop:2,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={data.evidencia}>"{data.evidencia}"</div>}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                            <div style={{textAlign:"center"}}>
                              <div style={{fontSize:11,fontWeight:700,color:confColor(c)}}>{(c*100).toFixed(0)}%</div>
                              <div style={{fontSize:8,color:T.muted}}>{confLabel(c)}</div>
                            </div>
                            {ok?(
                              <input type="checkbox" checked={!!fieldSel[key]} onChange={e=>setFieldSel(p=>({...p,[key]:e.target.checked}))} style={{accentColor:T.goldL,width:15,height:15,cursor:"pointer"}}/>
                            ):(
                              <div title="Confiança < 70% — revise manualmente"><AlertCircle size={14} color={T.redL}/></div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Não encontrado */}
                  {fileState.notFound.length>0&&(
                    <div style={{background:T.surf,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",marginBottom:10}}>
                      <div style={{fontSize:10,color:T.muted,marginBottom:5}}>Não encontrado — preencha manualmente:</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {fileState.notFound.map(f=>(
                          <span key={f} style={{fontSize:9,color:T.muted,background:T.card,border:`1px solid ${T.border}`,borderRadius:4,padding:"2px 6px"}}>{FIELD_LABELS[f]||f}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  <div style={{position:"sticky",bottom:0,background:T.card,paddingTop:10,marginTop:4,borderTop:`1px solid ${T.border}`}}>
                    <div style={{display:"flex",gap:8,marginBottom:5}}>
                      <button onClick={()=>{setFileState(emptyFileState());setShowPreview(false);}} style={{flex:1,padding:"10px",borderRadius:9,border:`1px solid ${T.border}`,background:"transparent",color:T.sub,fontSize:12,cursor:"pointer",fontWeight:600}}>
                        Cancelar
                      </button>
                      <button onClick={applySelected} style={{flex:2,padding:"10px",borderRadius:9,border:"none",background:`linear-gradient(135deg,${T.gold},${T.goldL})`,color:"#030b1a",fontSize:12,cursor:"pointer",fontWeight:700}}>
                        ✓ Aplicar Selecionados ({Object.values(fieldSel).filter(Boolean).length})
                      </button>
                    </div>
                    <div style={{fontSize:9,color:T.muted,textAlign:"center"}}>Confiança ≥70% · Você confirma antes de aplicar qualquer dado</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Input oculto — aceita PDF e imagens */}
      <input ref={fileRef} type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,image/*,application/pdf"
        onChange={e=>{if(e.target.files[0]){processFile(e.target.files[0]);e.target.value="";}}}
        style={{display:"none"}}/>

      <style>{`
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// FORMATADOR DE TEXTO
// ─────────────────────────────────────────────────────────────
function FormattedMessage({text}){
  if(!text) return null;
  return(
    <div>
      {text.split("\n").map((line,i)=>{
        if(line.startsWith("## ")) return <div key={i} style={{fontSize:13,fontWeight:700,color:T.goldL,marginTop:i>0?8:0,marginBottom:3}}>{line.replace("## ","")}</div>;
        if(line.startsWith("### ")) return <div key={i} style={{fontSize:12,fontWeight:700,color:T.sub,marginTop:6,marginBottom:2}}>{line.replace("### ","")}</div>;
        if(line.startsWith("- ")||line.startsWith("• ")) return <div key={i} style={{display:"flex",gap:5,marginBottom:2}}><span style={{color:T.goldL}}>·</span><span style={{fontSize:12}}><Inline text={line.replace(/^[-•] /,"")}/></span></div>;
        if(line.trim()==="") return <div key={i} style={{height:5}}/>;
        return <div key={i} style={{fontSize:12,marginBottom:2}}><Inline text={line}/></div>;
      })}
    </div>
  );
}
function Inline({text}){
  return<>{text.split(/(\*\*[^*]+\*\*)/g).map((p,i)=>p.startsWith("**")&&p.endsWith("**")?<strong key={i} style={{color:T.text,fontWeight:700}}>{p.slice(2,-2)}</strong>:<span key={i}>{p}</span>)}</>;
}
