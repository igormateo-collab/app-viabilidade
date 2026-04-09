import { useState, useMemo, useEffect, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  LayoutDashboard, Building2, MapPin, Layers, HardHat, Wallet,
  TrendingUp, Calendar, Landmark, Receipt, BarChart2, GitCompare,
  Activity, FileText, Scale, Settings, AlertTriangle, CheckCircle2,
  Plus, Trash2, BookOpen, Menu, X, ChevronDown, ChevronUp, Target
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// RESPONSIVE HOOK
// ═══════════════════════════════════════════════════════════════
function useBreakpoint() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return { isMobile: w < 640, isTablet: w < 1024, w };
}

// ═══════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════
const T = {
  bg:"#030b1a", surf:"#061020", card:"#091428", cardHov:"#0d1c38",
  border:"#0f1f3d", bBright:"#1a3560",
  gold:"#c9a227", goldL:"#f0c040", goldDim:"rgba(201,162,39,0.12)",
  blueL:"#60a5fa", blueDim:"rgba(29,78,216,0.12)",
  greenL:"#34d399", greenDim:"rgba(4,120,87,0.12)",
  redL:"#f87171", redDim:"rgba(185,28,28,0.12)",
  amberL:"#fbbf24", amberDim:"rgba(180,83,9,0.12)",
  purpleL:"#a78bfa", tealL:"#2dd4bf", orangeL:"#fb923c",
  text:"#e2e8f0", sub:"#94a3b8", muted:"#475569",
};
const PAL = [T.goldL,T.blueL,T.greenL,T.purpleL,T.amberL,T.redL,T.tealL,T.orangeL];

// ═══════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════
const f$ = v => {
  if (v == null || isNaN(v)) return "—";
  const a = Math.abs(v), s = v < 0 ? "-" : "";
  if (a >= 1e9) return `${s}R$${(a/1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}R$${(a/1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}R$${(a/1e3).toFixed(0)}K`;
  return `${s}R$${a.toFixed(0)}`;
};
const f$F = v => v?.toLocaleString("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:0,maximumFractionDigits:0})??"—";
const fP  = v => v!=null&&!isNaN(v)?`${(v*100).toFixed(1)}%`:"—";
const fN  = v => v?.toLocaleString("pt-BR",{maximumFractionDigits:0})??"—";

// ═══════════════════════════════════════════════════════════════
// FINANCIAL ENGINE
// ═══════════════════════════════════════════════════════════════
function tirCalc(cfs, g=0.02) {
  let r=g;
  for(let i=0;i<800;i++){
    let f=0,df=0;
    cfs.forEach((c,t)=>{ const d=Math.pow(1+r,t); f+=c/d; if(t>0) df-=t*c/(d*(1+r)); });
    if(Math.abs(df)<1e-15) break;
    const nr=r-f/df;
    if(!isFinite(nr)) break;
    if(Math.abs(nr-r)<1e-12){r=nr;break;}
    r=Math.max(-0.9999,Math.min(50,nr));
  }
  return r;
}
const vplCalc=(cfs,r)=>cfs.reduce((s,c,t)=>s+c/Math.pow(1+r,t),0);

function monteCarlo(s, runs=300) {
  const results=[];
  for(let i=0;i<runs;i++){
    const rand=(mu,sig)=>mu+sig*(Math.random()+Math.random()+Math.random()-1.5)*1.732;
    const ov={
      tipologias:s.tipologias.map(t=>({...t,preco:t.preco*rand(1,0.08)})),
      cubBase:s.cubBase*rand(1,0.07),
      velocidadeVendas:s.velocidadeVendas*rand(1,0.15),
      distrato:Math.max(0,s.distrato*rand(1,0.3)),
    };
    const r=calcProject(s,ov);
    results.push({mVGV:r.mVGV,tirA:r.tirA||0,VPL:r.VPL});
  }
  results.sort((a,b)=>a.mVGV-b.mVGV);
  const mn=results[0].mVGV*100, mx=results[runs-1].mVGV*100;
  const bk=10, bw=(mx-mn)/bk;
  const hist=[];
  for(let b=0;b<bk;b++){
    const lo=mn+b*bw, hi=lo+bw;
    const cnt=results.filter(r=>r.mVGV*100>=lo&&r.mVGV*100<hi).length;
    hist.push({range:`${lo.toFixed(0)}%`,cnt,freq:cnt/runs});
  }
  return {
    p10:results[Math.floor(runs*0.10)],
    p50:results[Math.floor(runs*0.50)],
    p90:results[Math.floor(runs*0.90)],
    hist, mean:results.reduce((a,r)=>a+r.mVGV,0)/runs
  };
}

function calcProject(s,ov={}) {
  const d={...s,...ov};
  const tips=ov.tipologias??d.tipologias;

  const vt=d.valorTerreno;
  const custoItbi=vt*d.itbi/100, custoReg=vt*d.registro/100, custoCorret=vt*d.corretagem/100;
  const custoTerreno=vt+custoItbi+custoReg+custoCorret+d.dueDigligence+d.honorariosJuridicos+d.sondagem+d.demolicao+d.desocupacao+d.outrosAquisicao;

  const nU=tips.reduce((a,t)=>a+t.qtd,0);
  const areaP=tips.reduce((a,t)=>a+t.qtd*t.areaPriv,0);
  const VGV=tips.reduce((a,t)=>a+t.qtd*t.preco,0);
  const ticketM=VGV/Math.max(nU,1);

  const cubEf=d.cubBase*d.fatorPadrao;
  const cBase=d.areaConstruida*cubEf;
  const cCont=cBase*d.contingencia/100;
  const cObra=cBase+cCont;
  const devSoft=d.projetos+d.aprovacoes+d.gerenciamento;
  const indiretos=d.adminObra+d.seguros+d.outrosIndiretos;
  const comissao=VGV*d.comissaoVendas/100;
  const mktg=VGV*d.marketing/100+d.standVendas+d.aptoDecorado+d.premiacaoComercial;
  const custoComercial=comissao+mktg;

  const rb=VGV*(1-d.descontoComercial/100)*(1-d.distrato/100)*(1-d.inadimplencia/100);
  const trib=rb*d.aliquotaRET/100;
  const rl=rb-comissao-trib;

  const finProd=cObra*d.percFinanciamento/100;
  const custoFinanc=finProd*(d.taxaFinanciamento/100)*(d.prazoTotal/12);
  const ct=custoTerreno+cObra+devSoft+indiretos+custoComercial+trib+custoFinanc;
  const lb=rl-ct;
  const mVGV=lb/Math.max(VGV,1), mLiq=lb/Math.max(rl,1), roi=lb/Math.max(ct,1);

  const P=Math.max(d.prazoTotal,1);
  const cf=new Array(P+1).fill(0);
  cf[0]-=custoTerreno*0.35;
  for(let m=1;m<=Math.min(12,P);m++) cf[m]-=custoTerreno*0.65/12;

  const m0=Math.min(d.mesInicioObra,P), mf=Math.min(d.mesEntrega,P);
  const dur=Math.max(1,mf-m0);
  let somaS=0; const wts=[];
  for(let k=0;k<dur;k++){const t=k/(dur-1||1);const w=0.5*Math.sin(t*Math.PI)+0.1+0.4*t;wts.push(w);somaS+=w;}
  for(let k=0;k<dur;k++){const m=m0+k;if(m<=P)cf[m]-=cObra*wts[k]/somaS;}

  const opex=devSoft+indiretos+mktg+trib+custoFinanc;
  for(let m=0;m<=P;m++) cf[m]-=opex/(P+1);

  let vendAcum=0;
  const vlU=rl/Math.max(nU,1);
  for(let m=d.mesLancamento;m<=P&&vendAcum<nU;m++){
    const mPL=m-d.mesLancamento;
    const vel=d.velocidadeVendas*Math.exp(-0.055*mPL);
    const vMes=Math.min(vel,nU-vendAcum);
    if(vMes<0.01) break;
    vendAcum+=vMes;
    cf[m]+=vlU*vMes*0.20;
    const mFP=Math.min(mf,P),nP=mFP-m;
    if(nP>0) for(let mk=m+1;mk<=mFP;mk++) cf[mk]+=vlU*vMes*0.45/nP;
    cf[Math.min(mf,P)]+=vlU*vMes*0.35;
  }

  let acc=0,expMax=0,payback=P;
  const acum=[];
  for(let m=0;m<=P;m++){
    acc+=cf[m];acum.push(acc);
    if(acc<expMax) expMax=acc;
    if(payback===P&&acc>=0&&m>0) payback=m;
  }
  let accD=0,paybackD=P;
  const tmaMes=Math.pow(1+d.tma/100,1/12)-1;
  for(let m=0;m<=P;m++){accD+=cf[m]/Math.pow(1+tmaMes,m);if(paybackD===P&&accD>=0&&m>0)paybackD=m;}

  const tirM=tirCalc(cf);
  const tirA=isFinite(tirM)?Math.pow(1+tirM,12)-1:null;
  const VPL=vplCalc(cf,tmaMes);
  const IL=expMax<-1?VPL/Math.abs(expMax):null;
  const capProprio=Math.max(Math.abs(expMax)-finProd,ct*0.3);
  const ROE=lb/Math.max(capProprio,1);
  const cPorM2=ct/Math.max(areaP,1), lPorM2=lb/Math.max(areaP,1), lPorU=lb/Math.max(nU,1);
  const precoMin=(ct+comissao)/Math.max(nU*(1-d.descontoComercial/100)*(1-d.distrato/100)*(1-d.aliquotaRET/100),1);

  const score=Math.min(100,Math.max(0,
    (mVGV>0?Math.min(mVGV/0.25*35,35):0)+
    (tirA&&tirA>d.tma/100?Math.min((tirA-d.tma/100)/0.15*25,25):0)+
    (VPL>0?Math.min(VPL/(VGV*0.1)*20,20):0)+
    (payback<P?Math.min((1-payback/P)*20,20):0)
  ));

  const serie=Array.from({length:P+1},(_,m)=>({
    mes:`M${m}`,
    entrada:+(Math.max(0,cf[m])/1e3).toFixed(1),
    saida:+(Math.abs(Math.min(0,cf[m]))/1e3).toFixed(1),
    saldo:+(cf[m]/1e3).toFixed(1),
    acum:+(acum[m]/1e3).toFixed(1),
    progObra:m>=m0&&m<mf?+((m-m0)/dur*100).toFixed(1):m>=mf?100:0,
  }));

  const comp=[
    {nome:"Terreno",v:custoTerreno},{nome:"Construção",v:cBase},{nome:"Contingência",v:cCont},
    {nome:"Dev Soft",v:devSoft},{nome:"Indiretos",v:indiretos},{nome:"Comercial",v:custoComercial},
    {nome:"Tributos",v:trib},{nome:"Custo Fin.",v:custoFinanc},
  ].map(c=>({...c,pct:c.v/Math.max(ct,1)}));

  const vgvTip=tips.map(t=>({
    nome:t.nome.includes("–")?t.nome.split("–")[1].trim():t.nome,
    v:t.qtd*t.preco,qtd:t.qtd,preco:t.preco,areaPriv:t.areaPriv,
    pct:(t.qtd*t.preco)/Math.max(VGV,1),pvM2:t.preco/Math.max(t.areaPriv,1),
  }));

  const status=mVGV<0?"INVIÁVEL":mVGV<0.10?"ATENÇÃO":mVGV<0.18?"VIÁVEL":"EXCELENTE";
  const statusC=mVGV<0?T.redL:mVGV<0.10?T.amberL:mVGV<0.18?T.blueL:T.greenL;
  const statusBg=mVGV<0?T.redDim:mVGV<0.10?T.amberDim:mVGV<0.18?T.blueDim:T.greenDim;

  return {
    custoTerreno,custoItbi,custoReg,custoCorret,VGV,nU,areaP,ticketM,
    cBase,cCont,cObra,devSoft,indiretos,cubEf,custoComercial,comissao,mktg,
    custoFinanc,finProd,capProprio,rb,trib,rl,ct,lb,
    mVGV,mLiq,roi,ROE,cPorM2,lPorM2,lPorU,precoMin,IL,
    tirA,VPL,payback,paybackD,expMax,score,
    serie,comp,vgvTip,cf,acum,status,statusC,statusBg,
  };
}

function calcScenarios(s) {
  return {
    pess:calcProject(s,{tipologias:s.tipologias.map(t=>({...t,preco:t.preco*0.88})),cubBase:s.cubBase*1.12,velocidadeVendas:s.velocidadeVendas*0.60,distrato:s.distrato*3}),
    base:calcProject(s),
    otim:calcProject(s,{tipologias:s.tipologias.map(t=>({...t,preco:t.preco*1.15})),cubBase:s.cubBase*0.93,velocidadeVendas:s.velocidadeVendas*1.50,distrato:s.distrato*0.4}),
  };
}

function calcSensitivity(s) {
  const base=calcProject(s);
  const vars=[-20,-10,10,20];
  const params=[
    {key:"preco",label:"Preço de Venda",apply:(d,v)=>({tipologias:d.tipologias.map(t=>({...t,preco:t.preco*(1+v/100)}))})},
    {key:"custo",label:"Custo Obra",apply:(d,v)=>({cubBase:d.cubBase*(1+v/100)})},
    {key:"vel",label:"Velocidade Vendas",apply:(d,v)=>({velocidadeVendas:d.velocidadeVendas*(1+v/100)})},
    {key:"terreno",label:"Custo Terreno",apply:(d,v)=>({valorTerreno:d.valorTerreno*(1+v/100)})},
    {key:"distrato",label:"Distrato",apply:(d,v)=>({distrato:d.distrato*(1+v/100)})},
    {key:"comissao",label:"Comissão",apply:(d,v)=>({comissaoVendas:d.comissaoVendas*(1+v/100)})},
  ];
  const results=params.map(p=>{
    const imps=[-20,-15,-10,-5,5,10,15,20].map(v=>{const r=calcProject(s,p.apply(s,v));return{v,mVGV:r.mVGV};});
    const deltas=imps.map(i=>Math.abs(i.mVGV-base.mVGV));
    return{...p,imps,maxDelta:Math.max(...deltas),minM:Math.min(...imps.map(i=>i.mVGV)),maxM:Math.max(...imps.map(i=>i.mVGV))};
  }).sort((a,b)=>b.maxDelta-a.maxDelta);
  return{results,base};
}

// ═══════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════
const INIT={
  nome:"Residencial Luiz Anselmo",tipo:"Residencial Vertical",
  empresa:"Almeida Lessa Engenharia",spe:"SPE Luiz Anselmo Ltda",
  cidade:"Salvador",uf:"BA",bairro:"Luiz Anselmo",padrao:"Alto Padrão",
  torres:1,pavimentos:7,
  valorTerreno:1800000,itbi:3.0,registro:0.8,corretagem:3.0,
  dueDigligence:28000,honorariosJuridicos:22000,sondagem:25000,demolicao:0,desocupacao:0,outrosAquisicao:15000,
  areaTerreno:900,areaConstruida:2600,
  tipologias:[
    {id:1,nome:"Tipo A – 2BR",areaPriv:65,qtd:8,vagas:1,preco:620000},
    {id:2,nome:"Tipo B – 3BR",areaPriv:85,qtd:10,vagas:2,preco:820000},
    {id:3,nome:"Tipo C – Cob.",areaPriv:95,qtd:2,vagas:2,preco:1100000},
  ],
  cubBase:2450,fatorPadrao:1.08,contingencia:5.0,
  projetos:320000,aprovacoes:85000,gerenciamento:240000,
  adminObra:160000,seguros:48000,outrosIndiretos:95000,
  comissaoVendas:6.0,marketing:1.5,standVendas:130000,aptoDecorado:85000,premiacaoComercial:40000,
  descontoComercial:1.5,distrato:2.0,inadimplencia:0.5,velocidadeVendas:3.5,
  aliquotaRET:4.0,percFinanciamento:50.0,taxaFinanciamento:12.0,
  mesLancamento:0,mesInicioObra:3,mesEntrega:30,prazoTotal:36,
  tma:12.0,cdi:11.5,incc:6.0,ipca:4.5,
};

// ═══════════════════════════════════════════════════════════════
// RESPONSIVE UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════
function useCSS(isMobile) {
  return {
    card:{background:T.card,border:`1px solid ${T.border}`,borderRadius:isMobile?10:12,padding:isMobile?"14px 16px":"20px 24px"},
    input:{background:T.surf,border:`1px solid ${T.border}`,borderRadius:8,padding:isMobile?"10px 12px":"8px 12px",color:T.text,fontSize:isMobile?16:14,width:"100%"},
    label:{color:T.sub,fontSize:12,fontWeight:500,letterSpacing:"0.04em",marginBottom:4,display:"block"},
    th:{color:T.sub,fontSize:10,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",padding:"9px 10px",borderBottom:`1px solid ${T.border}`,textAlign:"left"},
    td:{padding:"10px 10px",borderBottom:`1px solid ${T.border}`,fontSize:12,color:T.text},
    tdR:{padding:"10px 10px",borderBottom:`1px solid ${T.border}`,fontSize:12,color:T.text,textAlign:"right"},
  };
}

function Badge({children,color=T.greenL}){
  return<span style={{background:`${color}20`,color,border:`1px solid ${color}40`,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700}}>{children}</span>;
}

function StatCard({label,value,sub,color=T.goldL,icon:Icon,fmt="$",isMobile}){
  const disp=fmt==="$"?f$(value):fmt==="%"?fP(value):fmt==="n"?fN(value):value;
  return(
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:isMobile?"12px 14px":"16px 20px",display:"flex",flexDirection:"column",gap:6}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <span style={{fontSize:10,color:T.sub,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase",lineHeight:1.3}}>{label}</span>
        {Icon&&<Icon size={13} color={color} style={{opacity:.6}}/>}
      </div>
      <div style={{fontFamily:"'Courier New',monospace",fontSize:isMobile?18:20,fontWeight:700,color,letterSpacing:"-0.01em"}}>{disp}</div>
      {sub&&<div style={{fontSize:10,color:T.muted,lineHeight:1.3}}>{sub}</div>}
    </div>
  );
}

function ScoreRing({score,size=80}){
  const c=score>=70?T.greenL:score>=45?T.amberL:T.redL;
  const r=size*0.38,circ=2*Math.PI*r;
  return(
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={6}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={circ*(1-score/100)} strokeLinecap="round"/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <div style={{fontSize:size<70?14:18,fontWeight:800,color:c,fontFamily:"monospace",lineHeight:1}}>{score.toFixed(0)}</div>
        <div style={{fontSize:8,color:T.muted}}>Score</div>
      </div>
    </div>
  );
}

const CTooltip=({active,payload,label})=>{
  if(!active||!payload?.length) return null;
  return(
    <div style={{background:T.surf,border:`1px solid ${T.bBright}`,borderRadius:8,padding:"8px 12px",maxWidth:200}}>
      <p style={{color:T.sub,fontSize:10,marginBottom:4}}>{label}</p>
      {payload.map((p,i)=>(
        <p key={i} style={{color:p.color||T.text,fontSize:11,fontWeight:600}}>
          {p.name}: {typeof p.value==="number"&&Math.abs(p.value)>100?`${fN(p.value)}K`:p.value?.toFixed?.(1)??p.value}
        </p>
      ))}
    </div>
  );
};

function NumInput({label,value,onChange,prefix,suffix,step=1000,min,isMobile,css}){
  return(
    <label style={{display:"flex",flexDirection:"column",gap:4}}>
      <span style={css.label}>{label}</span>
      <div style={{display:"flex",alignItems:"center"}}>
        {prefix&&<span style={{...css.input,width:"auto",borderRight:"none",borderRadius:"8px 0 0 8px",color:T.muted,padding:"8px 10px",whiteSpace:"nowrap",background:T.bg}}>{prefix}</span>}
        <input type="number" value={value} onChange={e=>onChange(+e.target.value)} step={step} min={min}
          inputMode="decimal"
          style={{...css.input,borderRadius:prefix?(suffix?"0":"0 8px 8px 0"):(suffix?"8px 0 0 8px":"8px"),fontFamily:"'Courier New',monospace",textAlign:"right",flexGrow:1}}/>
        {suffix&&<span style={{...css.input,width:"auto",borderLeft:"none",borderRadius:"0 8px 8px 0",color:T.muted,padding:"8px 10px",whiteSpace:"nowrap",background:T.bg}}>{suffix}</span>}
      </div>
    </label>
  );
}

function SectionCat({children}){
  return<p style={{fontSize:11,color:T.gold,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${T.border}`}}>{children}</p>;
}

// Collapsible section for mobile
function Collapsible({title,children,defaultOpen=false}){
  const [open,setOpen]=useState(defaultOpen);
  return(
    <div style={{marginBottom:12}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",
          background:T.card,border:`1px solid ${T.border}`,borderRadius:open?"10px 10px 0 0":10,
          padding:"12px 16px",cursor:"pointer",color:T.text}}>
        <span style={{fontSize:13,fontWeight:700}}>{title}</span>
        {open?<ChevronUp size={16} color={T.sub}/>:<ChevronDown size={16} color={T.sub}/>}
      </button>
      {open&&(
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderTop:"none",borderRadius:"0 0 10px 10px",padding:"14px 16px"}}>
          {children}
        </div>
      )}
    </div>
  );
}

function Wrap({title,sub,children,isMobile}){
  return(
    <div style={{padding:isMobile?"16px 14px":"28px 32px",maxWidth:1400,margin:"0 auto"}}>
      <h2 style={{fontSize:isMobile?16:18,fontWeight:700,color:T.text,marginBottom:4,letterSpacing:"-0.02em"}}>{title}</h2>
      {sub&&<p style={{fontSize:12,color:T.sub,marginBottom:isMobile?16:24,lineHeight:1.5}}>{sub}</p>}
      {!sub&&<div style={{marginBottom:isMobile?16:24}}/>}
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function Dashboard({r,s,isMobile}){
  const alerts=[];
  if(r.mVGV<0) alerts.push({t:"danger",msg:`Projeto INVIÁVEL — margem negativa de ${fP(Math.abs(r.mVGV))}.`});
  else if(r.mVGV<0.10) alerts.push({t:"danger",msg:`Margem ${fP(r.mVGV)} — abaixo de 10%, alto risco.`});
  if(r.tirA!=null&&r.tirA<s.tma/100) alerts.push({t:"warn",msg:`TIR (${fP(r.tirA)}) abaixo da TMA (${s.tma}%).`});
  if(r.expMax<-5e6) alerts.push({t:"warn",msg:`Pico de caixa negativo de ${f$(r.expMax)}.`});
  if(r.mVGV>=0.18&&r.tirA>0.20) alerts.push({t:"ok",msg:`Excelente: margem ${fP(r.mVGV)}, TIR ${fP(r.tirA)}.`});

  const cols = isMobile ? "1fr 1fr" : "repeat(4,1fr)";
  const cols3 = isMobile ? "1fr 1fr" : "repeat(6,1fr)";

  return(
    <div style={{padding:isMobile?"14px":"28px 32px",maxWidth:1400,margin:"0 auto"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,gap:12}}>
        <div style={{flex:1,minWidth:0}}>
          <h1 style={{fontSize:isMobile?18:24,fontWeight:800,color:T.text,letterSpacing:"-0.02em",lineHeight:1.2}}>{s.nome}</h1>
          <p style={{fontSize:11,color:T.sub,marginTop:4}}>{s.bairro} · {s.cidade}/{s.uf}</p>
          <p style={{fontSize:10,color:T.muted}}>{s.tipo} · {s.padrao}</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
          <ScoreRing score={r.score} size={isMobile?64:80}/>
          <div style={{background:r.statusBg,border:`1px solid ${r.statusC}44`,borderRadius:8,padding:"6px 12px",textAlign:"center"}}>
            <div style={{fontSize:isMobile?12:14,fontWeight:800,color:r.statusC}}>{r.status}</div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {alerts.length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
          {alerts.map((a,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,
              background:a.t==="ok"?T.greenDim:a.t==="warn"?T.amberDim:T.redDim,
              border:`1px solid ${a.t==="ok"?T.greenL:a.t==="warn"?T.amberL:T.redL}44`,
              borderRadius:8,padding:"9px 12px"}}>
              {a.t==="ok"?<CheckCircle2 size={13} color={T.greenL}/>:<AlertTriangle size={13} color={a.t==="warn"?T.amberL:T.redL}/>}
              <span style={{fontSize:12,color:T.text,lineHeight:1.4}}>{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPIs Receita */}
      <p style={{fontSize:10,color:T.muted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>RECEITA</p>
      <div style={{display:"grid",gridTemplateColumns:cols,gap:8,marginBottom:8}}>
        <StatCard label="VGV Total"       value={r.VGV}      color={T.goldL} isMobile={isMobile}/>
        <StatCard label="Receita Líquida" value={r.rl}       color={T.blueL} isMobile={isMobile}/>
        <StatCard label="Ticket Médio"    value={r.ticketM}  color={T.goldL} isMobile={isMobile}/>
        <StatCard label="Unidades"        value={r.nU} fmt="n" color={T.sub} isMobile={isMobile}/>
      </div>

      {/* KPIs Resultado */}
      <p style={{fontSize:10,color:T.muted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>RESULTADO</p>
      <div style={{display:"grid",gridTemplateColumns:cols,gap:8,marginBottom:8}}>
        <StatCard label="Lucro Bruto"  value={r.lb}    color={r.lb>=0?T.greenL:T.redL} isMobile={isMobile}/>
        <StatCard label="Margem VGV"   value={r.mVGV}  fmt="%" color={r.statusC} isMobile={isMobile}/>
        <StatCard label="ROI"          value={r.roi}   fmt="%" color={T.greenL} isMobile={isMobile}/>
        <StatCard label="Custo Total"  value={r.ct}    color={T.redL} isMobile={isMobile}/>
      </div>

      {/* KPIs Financeiros */}
      <p style={{fontSize:10,color:T.muted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>FINANCEIROS</p>
      <div style={{display:"grid",gridTemplateColumns:cols,gap:8,marginBottom:16}}>
        <StatCard label="TIR Anual"   value={r.tirA}   fmt="%" color={r.tirA>s.tma/100?T.greenL:T.redL} isMobile={isMobile}/>
        <StatCard label="VPL"         value={r.VPL}    color={r.VPL>=0?T.greenL:T.redL} isMobile={isMobile}/>
        <StatCard label="Payback"     value={`${r.payback}m`} fmt="str" color={T.blueL} isMobile={isMobile}/>
        <StatCard label="Pico Caixa"  value={r.expMax} color={T.redL} isMobile={isMobile}/>
      </div>

      {/* Chart: Fluxo acumulado */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:isMobile?"14px":"20px 24px",marginBottom:12}}>
        <p style={{fontWeight:700,marginBottom:12,fontSize:13}}>Fluxo de Caixa Acumulado (R$K)</p>
        <ResponsiveContainer width="100%" height={isMobile?160:200}>
          <AreaChart data={r.serie.filter((_,i)=>i%2===0)} margin={{top:5,right:5,left:-20,bottom:0}}>
            <defs>
              <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.goldL} stopOpacity={0.3}/>
                <stop offset="100%" stopColor={T.goldL} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
            <XAxis dataKey="mes" tick={{fill:T.muted,fontSize:9}} tickLine={false} interval={Math.floor(r.serie.length/5)}/>
            <YAxis tick={{fill:T.muted,fontSize:9}} tickLine={false} axisLine={false}/>
            <Tooltip content={<CTooltip/>}/>
            <ReferenceLine y={0} stroke={T.bBright} strokeDasharray="4 2"/>
            <Area type="monotone" dataKey="acum" name="Acumulado(R$K)" stroke={T.goldL} fill="url(#gA)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart: composição de custos */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:isMobile?"14px":"20px 24px"}}>
          <p style={{fontWeight:700,marginBottom:12,fontSize:13}}>Composição de Custos</p>
          <div style={{display:"flex",gap:12,alignItems:"center",height:isMobile?160:180}}>
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie data={r.comp} dataKey="v" cx="50%" cy="50%" innerRadius={isMobile?40:48} outerRadius={isMobile?68:76} paddingAngle={2} stroke="none">
                  {r.comp.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                </Pie>
                <Tooltip formatter={v=>f$(v)} contentStyle={{background:T.surf,border:`1px solid ${T.bBright}`,borderRadius:8}}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
              {r.comp.filter(c=>c.v>0).map((c,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:7,height:7,borderRadius:2,background:PAL[i%PAL.length],flexShrink:0}}/>
                    <span style={{fontSize:10,color:T.sub}}>{c.nome}</span>
                  </div>
                  <span style={{fontSize:10,fontWeight:600,color:T.text,fontFamily:"monospace"}}>{fP(c.pct)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:isMobile?"14px":"20px 24px"}}>
          <p style={{fontWeight:700,marginBottom:12,fontSize:13}}>VGV por Tipologia</p>
          <ResponsiveContainer width="100%" height={isMobile?160:180}>
            <BarChart data={r.vgvTip} layout="vertical" margin={{top:0,right:40,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false}/>
              <XAxis type="number" tick={{fill:T.muted,fontSize:9}} tickLine={false} axisLine={false}/>
              <YAxis type="category" dataKey="nome" tick={{fill:T.sub,fontSize:10}} tickLine={false} width={45}/>
              <Tooltip formatter={v=>f$(v)} contentStyle={{background:T.surf,border:`1px solid ${T.bBright}`,borderRadius:8}}/>
              <Bar dataKey="v" name="VGV" radius={[0,4,4,0]}>
                {r.vgvTip.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRODUTO
// ═══════════════════════════════════════════════════════════════
function ProdutoModule({s,setS,r,isMobile}){
  const css=useCSS(isMobile);
  const add=()=>setS(p=>({...p,tipologias:[...p.tipologias,{id:Date.now(),nome:"Nova Tipologia",areaPriv:70,qtd:4,vagas:1,preco:500000}]}));
  const del=id=>setS(p=>({...p,tipologias:p.tipologias.filter(t=>t.id!==id)}));
  const upd=(id,f,v)=>setS(p=>({...p,tipologias:p.tipologias.map(t=>t.id===id?{...t,[f]:v}:t)}));

  return(
    <Wrap title="Produto Imobiliário" isMobile={isMobile}>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:8,marginBottom:16}}>
        <StatCard label="VGV Total"    value={r.VGV}       color={T.goldL} isMobile={isMobile}/>
        <StatCard label="Unidades"     value={r.nU} fmt="n" color={T.blueL} isMobile={isMobile}/>
        <StatCard label="Ticket Médio" value={r.ticketM}   color={T.goldL} isMobile={isMobile}/>
        <StatCard label="R$/m² médio"  value={r.VGV/r.areaP} fmt="n" color={T.greenL} isMobile={isMobile}/>
      </div>

      {isMobile ? (
        // Mobile: card por tipologia
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {s.tipologias.map(t=>{
            const vT=t.qtd*t.preco;
            return(
              <div key={t.id} style={{...css.card,position:"relative"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <input value={t.nome} onChange={e=>upd(t.id,"nome",e.target.value)}
                    style={{...css.input,fontWeight:700,fontSize:14,background:"transparent",border:"none",padding:0,width:"auto",flex:1}}/>
                  <button onClick={()=>del(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,padding:4}}>
                    <Trash2 size={14}/>
                  </button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <NumInput label="Área Privativa (m²)" value={t.areaPriv} onChange={v=>upd(t.id,"areaPriv",v)} step={5} css={css} isMobile/>
                  <NumInput label="Qtd. Unidades"       value={t.qtd}      onChange={v=>upd(t.id,"qtd",v)} step={1} min={0} css={css} isMobile/>
                  <NumInput label="Vagas"               value={t.vagas}    onChange={v=>upd(t.id,"vagas",v)} step={1} min={0} css={css} isMobile/>
                  <NumInput label="Preço (R$)"          value={t.preco}    onChange={v=>upd(t.id,"preco",v)} step={10000} css={css} isMobile/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:`1px solid ${T.border}`}}>
                  <span style={{fontSize:12,color:T.sub}}>VGV Parcial</span>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <Badge color={T.blueL}>{fP(vT/r.VGV)}</Badge>
                    <span style={{fontSize:13,fontWeight:700,color:T.goldL,fontFamily:"monospace"}}>{f$(vT)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <button onClick={add} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,
            background:T.goldDim,border:`1px solid ${T.gold}44`,color:T.goldL,borderRadius:10,
            padding:"12px",fontSize:13,cursor:"pointer",fontWeight:600}}>
            <Plus size={14}/> Adicionar Tipologia
          </button>
        </div>
      ) : (
        // Desktop: tabela
        <div style={css.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <p style={{fontWeight:700,fontSize:14}}>Mix de Produto</p>
            <button onClick={add} style={{display:"flex",alignItems:"center",gap:6,background:T.goldDim,border:`1px solid ${T.gold}44`,color:T.goldL,borderRadius:8,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>
              <Plus size={13}/> Adicionar Tipologia
            </button>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr>
                {["Tipologia","Área(m²)","Vagas","Qtd","Preço(R$)","VGV","% VGV","R$/m²",""].map(h=>(
                  <th key={h} style={css.th}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {s.tipologias.map(t=>{
                  const vT=t.qtd*t.preco;
                  return(
                    <tr key={t.id}>
                      <td style={css.td}><input value={t.nome} onChange={e=>upd(t.id,"nome",e.target.value)} style={{...css.input,padding:"4px 8px",fontSize:12}}/></td>
                      <td style={css.td}><input type="number" value={t.areaPriv} onChange={e=>upd(t.id,"areaPriv",+e.target.value)} style={{...css.input,padding:"4px 8px",width:65,textAlign:"right",fontFamily:"monospace"}}/></td>
                      <td style={css.td}><input type="number" value={t.vagas}    onChange={e=>upd(t.id,"vagas",+e.target.value)}    style={{...css.input,padding:"4px 8px",width:45,textAlign:"right",fontFamily:"monospace"}}/></td>
                      <td style={css.td}><input type="number" value={t.qtd}      onChange={e=>upd(t.id,"qtd",+e.target.value)}      style={{...css.input,padding:"4px 8px",width:55,textAlign:"right",fontFamily:"monospace"}}/></td>
                      <td style={css.td}><input type="number" value={t.preco}    onChange={e=>upd(t.id,"preco",+e.target.value)} step={10000} style={{...css.input,padding:"4px 8px",width:110,textAlign:"right",fontFamily:"monospace"}}/></td>
                      <td style={{...css.tdR,fontFamily:"monospace",fontWeight:600,color:T.goldL}}>{f$(vT)}</td>
                      <td style={css.tdR}><Badge color={T.blueL}>{fP(vT/r.VGV)}</Badge></td>
                      <td style={{...css.tdR,fontFamily:"monospace"}}>{fN(t.preco/t.areaPriv)}</td>
                      <td style={css.td}><button onClick={()=>del(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted}}><Trash2 size={13}/></button></td>
                    </tr>
                  );
                })}
                <tr style={{background:T.surf}}>
                  <td style={{...css.td,fontWeight:700}} colSpan={3}>TOTAL</td>
                  <td style={{...css.td,fontWeight:700,fontFamily:"monospace"}}>{r.nU}</td>
                  <td style={css.td}/>
                  <td style={{...css.tdR,fontWeight:700,fontFamily:"monospace",color:T.goldL}}>{f$(r.VGV)}</td>
                  <td style={css.tdR}><Badge color={T.goldL}>100%</Badge></td>
                  <td style={{...css.tdR,fontFamily:"monospace"}}>{fN(r.VGV/r.areaP)}</td>
                  <td style={css.td}/>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Wrap>
  );
}

// ═══════════════════════════════════════════════════════════════
// CUSTOS (mobile-first collapsible)
// ═══════════════════════════════════════════════════════════════
function CustosModule({s,setS,r,isMobile}){
  const css=useCSS(isMobile);
  const upd=(f,v)=>setS(p=>({...p,[f]:v}));
  const groups=[
    {g:"Construção",items:[
      {l:"CUB Base (R$/m²)",f:"cubBase",step:50},{l:"Fator de Padrão (×)",f:"fatorPadrao",step:0.01},
      {l:"Área Construída (m²)",f:"areaConstruida",step:50,s:"m²"},{l:"Contingência (%)",f:"contingencia",step:0.5,s:"%"},
    ]},
    {g:"Projetos e Aprovações",items:[
      {l:"Projetos Executivos",f:"projetos"},{l:"Aprovações",f:"aprovacoes"},{l:"Gerenciamento",f:"gerenciamento"},
    ]},
    {g:"Indiretos",items:[
      {l:"Administração da Obra",f:"adminObra"},{l:"Seguros",f:"seguros"},{l:"Outros",f:"outrosIndiretos"},
    ]},
    {g:"Comercial",items:[
      {l:"Comissão de Vendas (%)",f:"comissaoVendas",step:0.5,s:"%"},{l:"Marketing (% VGV)",f:"marketing",step:0.5,s:"%"},
      {l:"Stand de Vendas",f:"standVendas"},{l:"Apto. Decorado",f:"aptoDecorado"},{l:"Premiação",f:"premiacaoComercial"},
    ]},
  ];
  return(
    <Wrap title="Custos" isMobile={isMobile}>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:8,marginBottom:16}}>
        <StatCard label="Custo Total"   value={r.ct}    color={T.redL}  isMobile={isMobile}/>
        <StatCard label="Construção"    value={r.cObra} color={T.amberL} isMobile={isMobile}/>
        <StatCard label="CUB Efetivo"   value={r.cubEf} fmt="n" color={T.blueL} isMobile={isMobile} sub="R$/m²"/>
        <StatCard label="Custo/m²"      value={r.cPorM2} fmt="n" color={T.purpleL} isMobile={isMobile}/>
      </div>
      {groups.map(row=>(
        isMobile?(
          <Collapsible key={row.g} title={row.g}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {row.items.map(it=><NumInput key={it.f} label={it.l} value={s[it.f]} onChange={v=>upd(it.f,v)} suffix={it.s} step={it.step||1000} css={css} isMobile/>)}
            </div>
          </Collapsible>
        ):(
          <div key={row.g} style={{...css.card,marginBottom:14}}>
            <SectionCat>{row.g.toUpperCase()}</SectionCat>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {row.items.map(it=><NumInput key={it.f} label={it.l} value={s[it.f]} onChange={v=>upd(it.f,v)} suffix={it.s} step={it.step||1000} css={css}/>)}
            </div>
          </div>
        )
      ))}
      <div style={{...css.card,marginTop:4}}>
        <SectionCat>MEMÓRIA DE CÁLCULO</SectionCat>
        {[
          {l:"Construção Base",v:r.cBase,f:`${fN(s.areaConstruida)}m² × R$${fN(s.cubBase)} × ${s.fatorPadrao}`},
          {l:"+ Contingência",  v:r.cCont,f:`${s.contingencia}%`},
          {l:"= Custo Obra",    v:r.cObra,bold:true},
          {l:"+ Dev Soft",      v:r.devSoft},
          {l:"+ Indiretos",     v:r.indiretos},
          {l:"+ Comercial",     v:r.custoComercial},
          {l:"+ Tributos",      v:r.trib},
          {l:"+ Terreno",       v:r.custoTerreno},
          {l:"= CUSTO TOTAL",   v:r.ct,bold:true,color:T.redL},
        ].map((row,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.border}`}}>
            <div>
              <div style={{fontSize:12,color:row.bold?T.text:T.sub,fontWeight:row.bold?700:400}}>{row.l}</div>
              {row.f&&<div style={{fontSize:10,color:T.muted}}>{row.f}</div>}
            </div>
            {row.v!=null&&<span style={{fontSize:row.bold?14:12,fontWeight:row.bold?800:600,color:row.color||T.text,fontFamily:"monospace"}}>{f$(row.v)}</span>}
          </div>
        ))}
      </div>
    </Wrap>
  );
}

// ═══════════════════════════════════════════════════════════════
// INDICADORES
// ═══════════════════════════════════════════════════════════════
function IndicadoresModule({r,s,isMobile}){
  const kpis=[
    {l:"VGV",             v:f$(r.VGV),     f:"Σ preço×qtd",                       c:T.goldL},
    {l:"Receita Bruta",   v:f$(r.rb),      f:"VGV×(1−desc.)×(1−dist.)×(1−inaDimp.)",c:T.blueL},
    {l:"Receita Líquida", v:f$(r.rl),      f:"RB − Comissão − Tributos",           c:T.blueL},
    {l:"Custo Total",     v:f$(r.ct),      f:"Σ todos os custos",                  c:T.redL},
    {l:"Lucro Bruto",     v:f$(r.lb),      f:"RL − Custo Total",                   c:r.lb>=0?T.greenL:T.redL},
    {l:"Margem VGV",      v:fP(r.mVGV),    f:"Lucro / VGV",                        c:r.statusC},
    {l:"Margem Líquida",  v:fP(r.mLiq),    f:"Lucro / RL",                         c:r.statusC},
    {l:"ROI",             v:fP(r.roi),     f:"Lucro / Custo Total",                c:T.greenL},
    {l:"ROE",             v:fP(r.ROE),     f:"Lucro / Capital Próprio",            c:T.greenL},
    {l:"TIR Anual",       v:r.tirA?fP(r.tirA):"—", f:"Newton-Raphson s/ FC mensal",c:r.tirA>s.tma/100?T.greenL:T.redL},
    {l:"VPL",             v:f$(r.VPL),     f:`Σ FC/(1+TMA_mes)^t, TMA=${s.tma}%`, c:r.VPL>=0?T.greenL:T.redL},
    {l:"Payback Simples", v:`${r.payback}m`,f:"Menor t onde acum ≥ 0",            c:T.blueL},
    {l:"Payback Desc.",   v:`${r.paybackD}m`,f:"Payback sobre fluxo descontado",  c:T.blueL},
    {l:"Exposição Máx.",  v:f$(r.expMax),  f:"Pior saldo acumulado",               c:T.redL},
    {l:"Preço Mínimo",    v:f$(r.precoMin),f:"Preço que zera o lucro",             c:T.amberL},
    {l:"Lucro/Unidade",   v:f$(r.lPorU),   f:"Lucro / Nº Unidades",               c:T.greenL},
    {l:"Lucro/m²",        v:f$(r.lPorM2),  f:"Lucro / Área Privativa",            c:T.greenL},
    {l:"Score",           v:`${r.score.toFixed(0)}/100`,f:"Composto 4 fatores",   c:r.score>=70?T.greenL:r.score>=45?T.amberL:T.redL},
  ];
  return(
    <Wrap title="Indicadores de Viabilidade" isMobile={isMobile}>
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,
        background:r.statusBg,border:`1px solid ${r.statusC}44`,borderRadius:10,padding:"12px 16px"}}>
        <ScoreRing score={r.score} size={isMobile?56:72}/>
        <div>
          <div style={{fontSize:isMobile?18:22,fontWeight:800,color:r.statusC}}>{r.status}</div>
          <div style={{fontSize:12,color:T.sub}}>Margem: {fP(r.mVGV)} · TIR: {r.tirA?fP(r.tirA):"—"} · VPL: {f$(r.VPL)}</div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {kpis.map(item=>(
          <div key={item.l} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,
            padding:"11px 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,color:T.text}}>{item.l}</div>
              <div style={{fontSize:10,color:T.muted,fontStyle:"italic",marginTop:2,lineHeight:1.3}}>{item.f}</div>
            </div>
            <span style={{fontSize:15,fontWeight:700,color:item.c,fontFamily:"monospace",whiteSpace:"nowrap"}}>{item.v}</span>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

// ═══════════════════════════════════════════════════════════════
// CENÁRIOS
// ═══════════════════════════════════════════════════════════════
function CenariosModule({s,isMobile}){
  const {pess,base,otim}=useMemo(()=>calcScenarios(s),[s]);
  const cen=[
    {label:"PESSIMISTA",r:pess,color:T.redL,  bg:T.redDim,  desc:"Preço −12% · Custo +12% · Vel −40%"},
    {label:"BASE",       r:base,color:T.goldL, bg:T.goldDim, desc:"Premissas originais"},
    {label:"OTIMISTA",   r:otim,color:T.greenL,bg:T.greenDim,desc:"Preço +15% · Custo −7% · Vel +50%"},
  ];
  const rows=[
    {l:"Lucro",      f:r=>f$(r.lb),    color:r=>r.lb>=0?T.greenL:T.redL},
    {l:"Margem VGV", f:r=>fP(r.mVGV), color:r=>r.statusC},
    {l:"TIR",        f:r=>r.tirA?fP(r.tirA):"—", color:r=>r.tirA>s.tma/100?T.greenL:T.redL},
    {l:"VPL",        f:r=>f$(r.VPL),  color:r=>r.VPL>=0?T.greenL:T.redL},
    {l:"Payback",    f:r=>`${r.payback}m`},
    {l:"Status",     f:r=>r.status,   color:r=>r.statusC},
  ];
  return(
    <Wrap title="Cenários" isMobile={isMobile}>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
        {cen.map(c=>(
          <div key={c.label} style={{background:c.bg,border:`1px solid ${c.color}44`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div>
                <Badge color={c.color}>{c.label}</Badge>
                <div style={{fontSize:10,color:T.muted,marginTop:4}}>{c.desc}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"monospace",fontSize:24,fontWeight:700,color:c.color}}>{fP(c.r.mVGV)}</div>
                <div style={{fontSize:10,color:T.sub}}>Margem VGV</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {[{l:"Lucro",v:f$(c.r.lb)},{l:"TIR",v:c.r.tirA?fP(c.r.tirA):"—"},{l:"Payback",v:`${c.r.payback}m`}].map(row=>(
                <div key={row.l} style={{background:`${c.color}10`,borderRadius:6,padding:"8px"}}>
                  <div style={{fontSize:10,color:T.muted}}>{row.l}</div>
                  <div style={{fontSize:13,fontWeight:700,color:c.color,fontFamily:"monospace"}}>{row.v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Tabela comparativa */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 16px",overflowX:"auto"}}>
        <p style={{fontWeight:700,marginBottom:12,fontSize:13}}>Comparativo</p>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:280}}>
          <thead><tr>
            <th style={{...{color:T.sub,fontSize:10,fontWeight:600,padding:"8px 8px",borderBottom:`1px solid ${T.border}`,textAlign:"left"}}}>Indicador</th>
            {cen.map(c=><th key={c.label} style={{color:c.color,fontSize:10,fontWeight:700,padding:"8px 8px",borderBottom:`1px solid ${T.border}`,textAlign:"right"}}>{c.label.slice(0,4)}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((k,i)=>(
              <tr key={i} style={{background:i%2===0?"transparent":T.surf}}>
                <td style={{padding:"9px 8px",fontSize:12,color:T.sub,borderBottom:`1px solid ${T.border}`}}>{k.l}</td>
                {cen.map((c,j)=>(
                  <td key={j} style={{padding:"9px 8px",textAlign:"right",fontSize:12,borderBottom:`1px solid ${T.border}`,fontWeight:600,fontFamily:"monospace",color:k.color?k.color(c.r):T.text}}>
                    {k.f(c.r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Wrap>
  );
}

// ═══════════════════════════════════════════════════════════════
// SENSIBILIDADE + MONTE CARLO
// ═══════════════════════════════════════════════════════════════
function SensibilidadeModule({s,isMobile}){
  const {results,base}=useMemo(()=>calcSensitivity(s),[s]);
  const mc=useMemo(()=>monteCarlo(s,300),[s]);
  const bm=+(base.mVGV*100).toFixed(2);
  const tornData=[...results].reverse().map(r=>({nome:r.label,min:+(r.minM*100).toFixed(2),max:+(r.maxM*100).toFixed(2)}));

  return(
    <Wrap title="Sensibilidade e Risco" isMobile={isMobile}>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:8,marginBottom:16}}>
        <StatCard label="Margem Base" value={base.mVGV} fmt="%" color={base.statusC} isMobile={isMobile}/>
        <StatCard label="P10 (MC)"    value={mc.p10.mVGV} fmt="%" color={T.redL} isMobile={isMobile}/>
        <StatCard label="P50 (MC)"    value={mc.p50.mVGV} fmt="%" color={T.blueL} isMobile={isMobile}/>
        <StatCard label="P90 (MC)"    value={mc.p90.mVGV} fmt="%" color={T.greenL} isMobile={isMobile}/>
      </div>

      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 16px",marginBottom:12}}>
        <p style={{fontWeight:700,marginBottom:4,fontSize:13}}>Tornado — Impacto na Margem (%)</p>
        <p style={{fontSize:10,color:T.muted,marginBottom:12}}>Variação ±20% em cada premissa. Base = {fP(base.mVGV)}.</p>
        <ResponsiveContainer width="100%" height={isMobile?220:260}>
          <BarChart data={tornData} layout="vertical" margin={{top:0,right:40,left:isMobile?80:120,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false}/>
            <XAxis type="number" tick={{fill:T.muted,fontSize:9}} tickLine={false} axisLine={false} tickFormatter={v=>`${v}%`} domain={["auto","auto"]}/>
            <YAxis type="category" dataKey="nome" tick={{fill:T.sub,fontSize:isMobile?9:10}} tickLine={false} width={isMobile?78:118}/>
            <Tooltip formatter={v=>`${v}%`} contentStyle={{background:T.surf,border:`1px solid ${T.bBright}`,borderRadius:8}}/>
            <ReferenceLine x={bm} stroke={T.goldL} strokeDasharray="4 2" strokeWidth={1.5}/>
            <Bar dataKey="min" name="Negativo" fill={T.redL} opacity={0.85}/>
            <Bar dataKey="max" name="Positivo" fill={T.greenL} opacity={0.85}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 16px"}}>
        <p style={{fontWeight:700,marginBottom:4,fontSize:13}}>Monte Carlo — Distribuição da Margem VGV</p>
        <p style={{fontSize:10,color:T.muted,marginBottom:12}}>300 simulações com variação aleatória nas premissas.</p>
        <ResponsiveContainer width="100%" height={isMobile?150:180}>
          <BarChart data={mc.hist} margin={{top:5,right:10,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
            <XAxis dataKey="range" tick={{fill:T.muted,fontSize:9}} tickLine={false}/>
            <YAxis tick={{fill:T.muted,fontSize:9}} tickLine={false} axisLine={false} tickFormatter={v=>`${(v*100).toFixed(0)}%`}/>
            <Tooltip formatter={v=>`${(v*100).toFixed(1)}%`} contentStyle={{background:T.surf,border:`1px solid ${T.bBright}`,borderRadius:8}}/>
            <Bar dataKey="freq" name="Freq." radius={[3,3,0,0]}>
              {mc.hist.map((d,i)=><Cell key={i} fill={+d.range.replace("%","")<10?T.redL:+d.range.replace("%","")>18?T.greenL:T.blueL} opacity={0.8}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:12}}>
          {[{l:"P10",v:mc.p10.mVGV,c:T.redL},{l:"Mediana",v:mc.p50.mVGV,c:T.blueL},{l:"P90",v:mc.p90.mVGV,c:T.greenL}].map(item=>(
            <div key={item.l} style={{background:T.surf,borderRadius:8,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:10,color:T.muted}}>{item.l}</div>
              <div style={{fontSize:15,fontWeight:700,color:item.c,fontFamily:"monospace"}}>{fP(item.v)}</div>
            </div>
          ))}
        </div>
      </div>
    </Wrap>
  );
}

// ═══════════════════════════════════════════════════════════════
// FLUXO DE CAIXA
// ═══════════════════════════════════════════════════════════════
function FluxoCaixaModule({r,s,isMobile}){
  const [period,setPeriod]=useState("trimestral");
  const tableData=useMemo(()=>{
    if(period==="trimestral"){
      const arr=[];
      for(let i=0;i<r.serie.length;i+=3){
        const sl=r.serie.slice(i,i+3);
        arr.push({mes:`T${Math.floor(i/3)+1}`,entrada:sl.reduce((a,x)=>a+x.entrada,0),saida:sl.reduce((a,x)=>a+x.saida,0),acum:sl[sl.length-1]?.acum??0});
      }
      return arr;
    }
    if(period==="anual"){
      const arr=[];
      for(let i=0;i<r.serie.length;i+=12){
        const sl=r.serie.slice(i,i+12);
        arr.push({mes:`Ano ${Math.floor(i/12)+1}`,entrada:sl.reduce((a,x)=>a+x.entrada,0),saida:sl.reduce((a,x)=>a+x.saida,0),acum:sl[sl.length-1]?.acum??0});
      }
      return arr;
    }
    return r.serie;
  },[period,r.serie]);

  return(
    <Wrap title="Fluxo de Caixa" isMobile={isMobile}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        <StatCard label="Receita Líquida" value={r.rl}     color={T.greenL} isMobile={isMobile}/>
        <StatCard label="Pico Negativo"   value={r.expMax} color={T.redL}   isMobile={isMobile}/>
        <StatCard label="Resultado Final" value={r.lb}     color={r.lb>=0?T.greenL:T.redL} isMobile={isMobile}/>
        <StatCard label="Payback"         value={`${r.payback}m`} fmt="str" color={T.blueL} isMobile={isMobile}/>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {["mensal","trimestral","anual"].map(v=>(
          <button key={v} onClick={()=>setPeriod(v)} style={{flex:1,padding:"8px",borderRadius:8,border:`1px solid ${T.border}`,cursor:"pointer",fontSize:11,fontWeight:600,textTransform:"capitalize",background:period===v?T.goldDim:"transparent",color:period===v?T.goldL:T.muted}}>{v}</button>
        ))}
      </div>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 16px",marginBottom:12}}>
        <ResponsiveContainer width="100%" height={isMobile?180:240}>
          <ComposedChart data={tableData} margin={{top:5,right:5,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
            <XAxis dataKey="mes" tick={{fill:T.muted,fontSize:9}} tickLine={false}/>
            <YAxis yAxisId="bar" tick={{fill:T.muted,fontSize:9}} tickLine={false} axisLine={false}/>
            <YAxis yAxisId="line" orientation="right" tick={{fill:T.muted,fontSize:9}} tickLine={false} axisLine={false}/>
            <Tooltip content={<CTooltip/>}/>
            <Legend formatter={v=><span style={{color:T.sub,fontSize:10}}>{v}</span>}/>
            <Bar yAxisId="bar" dataKey="saida"   name="Saídas"   fill={T.redL}   opacity={0.75} radius={[2,2,0,0]}/>
            <Bar yAxisId="bar" dataKey="entrada" name="Entradas" fill={T.greenL} opacity={0.75} radius={[2,2,0,0]}/>
            <Line yAxisId="line" type="monotone" dataKey="acum" name="Acumulado" stroke={T.goldL} strokeWidth={2} dot={false}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:260}}>
          <thead><tr>
            {["Período","Entradas","Saídas","Acumulado"].map((h,i)=>(
              <th key={h} style={{color:T.sub,fontSize:10,fontWeight:600,padding:"8px 6px",borderBottom:`1px solid ${T.border}`,textAlign:i===0?"left":"right"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {tableData.map((row,i)=>(
              <tr key={i} style={{background:i%2===0?"transparent":T.surf}}>
                <td style={{padding:"8px 6px",fontSize:11,color:T.text,borderBottom:`1px solid ${T.border}`}}>{row.mes}</td>
                <td style={{padding:"8px 6px",fontSize:11,color:T.greenL,fontFamily:"monospace",textAlign:"right",borderBottom:`1px solid ${T.border}`}}>{fN(row.entrada)}K</td>
                <td style={{padding:"8px 6px",fontSize:11,color:T.redL,fontFamily:"monospace",textAlign:"right",borderBottom:`1px solid ${T.border}`}}>{fN(row.saida)}K</td>
                <td style={{padding:"8px 6px",fontSize:11,color:row.acum>=0?T.goldL:T.redL,fontFamily:"monospace",fontWeight:600,textAlign:"right",borderBottom:`1px solid ${T.border}`}}>{fN(row.acum)}K</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Wrap>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════
function ConfigModule({s,setS,isMobile}){
  const css=useCSS(isMobile);
  const upd=(f,v)=>setS(p=>({...p,[f]:v}));
  return(
    <Wrap title="Configurações" isMobile={isMobile}>
      <Collapsible title="Dados do Projeto" defaultOpen={true}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          {[{l:"Nome do Projeto",f:"nome"},{l:"Empresa",f:"empresa"},{l:"SPE",f:"spe"}].map(it=>(
            <label key={it.f}><span style={css.label}>{it.l}</span>
              <input type="text" value={s[it.f]} onChange={e=>upd(it.f,e.target.value)} style={css.input}/>
            </label>
          ))}
        </div>
      </Collapsible>
      <Collapsible title="Índices Econômicos" defaultOpen={true}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr",gap:12}}>
          <NumInput label="TMA (% a.a.)"  value={s.tma}  onChange={v=>upd("tma",v)}  suffix="%" step={0.5} css={css} isMobile={isMobile}/>
          <NumInput label="CDI (% a.a.)"  value={s.cdi}  onChange={v=>upd("cdi",v)}  suffix="%" step={0.5} css={css} isMobile={isMobile}/>
          <NumInput label="INCC (% a.a.)" value={s.incc} onChange={v=>upd("incc",v)} suffix="%" step={0.5} css={css} isMobile={isMobile}/>
          <NumInput label="IPCA (% a.a.)" value={s.ipca} onChange={v=>upd("ipca",v)} suffix="%" step={0.5} css={css} isMobile={isMobile}/>
        </div>
      </Collapsible>
      <Collapsible title="Tributação" defaultOpen>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <NumInput label="Alíquota RET (% sobre RB)" value={s.aliquotaRET} onChange={v=>upd("aliquotaRET",v)} suffix="%" step={0.5} css={css} isMobile={isMobile}/>
          <NumInput label="Financiamento Produção (%)" value={s.percFinanciamento} onChange={v=>upd("percFinanciamento",v)} suffix="%" step={5} css={css} isMobile={isMobile}/>
          <NumInput label="Taxa Financiamento (% a.a.)" value={s.taxaFinanciamento} onChange={v=>upd("taxaFinanciamento",v)} suffix="%" step={0.5} css={css} isMobile={isMobile}/>
        </div>
      </Collapsible>
      <Collapsible title="Cronograma">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <NumInput label="Mês Lançamento"  value={s.mesLancamento}  onChange={v=>upd("mesLancamento",v)}  suffix="m" step={1} min={0} css={css} isMobile={isMobile}/>
          <NumInput label="Início Obra"      value={s.mesInicioObra}  onChange={v=>upd("mesInicioObra",v)}  suffix="m" step={1} min={0} css={css} isMobile={isMobile}/>
          <NumInput label="Entrega"          value={s.mesEntrega}     onChange={v=>upd("mesEntrega",v)}     suffix="m" step={1} min={1} css={css} isMobile={isMobile}/>
          <NumInput label="Prazo Total"      value={s.prazoTotal}     onChange={v=>upd("prazoTotal",v)}     suffix="m" step={1} min={1} css={css} isMobile={isMobile}/>
        </div>
      </Collapsible>
    </Wrap>
  );
}

// ═══════════════════════════════════════════════════════════════
// RELATÓRIOS
// ═══════════════════════════════════════════════════════════════
function RelatoriosModule({r,s,isMobile}){
  return(
    <Wrap title="Relatórios" isMobile={isMobile}>
      <div style={{background:r.statusBg,border:`1px solid ${r.statusC}44`,borderRadius:12,padding:"14px 16px",marginBottom:16}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <ScoreRing score={r.score} size={isMobile?56:64}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:isMobile?14:16,fontWeight:700,color:T.text,marginBottom:6}}>Parecer Executivo — {s.nome}</div>
            <p style={{fontSize:12,color:T.sub,lineHeight:1.7}}>
              {s.tipo} padrão {s.padrao} em {s.bairro}/{s.cidade}.
              VGV <strong style={{color:T.goldL}}>{f$(r.VGV)}</strong> · {r.nU} unidades.
              Margem <strong style={{color:r.statusC}}>{fP(r.mVGV)}</strong> ·
              TIR <strong style={{color:r.tirA>s.tma/100?T.greenL:T.redL}}>{r.tirA?fP(r.tirA):"—"}</strong> ·
              VPL <strong style={{color:r.VPL>=0?T.greenL:T.redL}}>{f$(r.VPL)}</strong> ·
              Payback <strong style={{color:T.blueL}}>{r.payback}m</strong>.
              Pico de caixa <strong style={{color:T.redL}}>{f$(r.expMax)}</strong>.
              Projeto <strong style={{color:r.statusC}}>{r.status.toLowerCase()}</strong>.
            </p>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:10}}>
        {["Relatório Executivo Completo","Fluxo de Caixa Detalhado","Composição de Custos","Análise de Sensibilidade","Comparativo de Cenários","Memória de Cálculo"].map(doc=>(
          <button key={doc} onClick={()=>alert(`"${doc}" — disponível na versão com backend.`)}
            style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px",
              cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,color:T.text,fontWeight:500}}>{doc}</span>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <span style={{background:T.surf,borderRadius:5,padding:"3px 8px",fontSize:10,color:T.sub}}>PDF</span>
              <span style={{background:T.surf,borderRadius:5,padding:"3px 8px",fontSize:10,color:T.sub}}>XLS</span>
            </div>
          </button>
        ))}
      </div>
    </Wrap>
  );
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════
const NAVS=[
  {id:"dashboard",    label:"Dashboard",  icon:LayoutDashboard, group:"VISÃO GERAL"},
  {id:"cadastro_cfg", label:"Configurações",icon:Settings,      group:"VISÃO GERAL"},
  {id:"produto",      label:"Produto",    icon:Layers,          group:"DADOS"},
  {id:"custos",       label:"Custos",     icon:HardHat,         group:"DADOS"},
  {id:"fluxo",        label:"Fluxo Caixa",icon:TrendingUp,      group:"ANÁLISE"},
  {id:"indicadores",  label:"Indicadores",icon:BarChart2,       group:"ANÁLISE"},
  {id:"cenarios",     label:"Cenários",   icon:GitCompare,      group:"ANÁLISE"},
  {id:"sensibilidade",label:"Sensibilid.",icon:Activity,        group:"ANÁLISE"},
  {id:"relatorios",   label:"Relatórios", icon:FileText,        group:"SAÍDAS"},
];

// Desktop Sidebar
function Sidebar({active,setActive,r}){
  const groups=[...new Set(NAVS.map(n=>n.group))];
  return(
    <div style={{width:200,background:T.surf,borderRight:`1px solid ${T.border}`,
      height:"100vh",display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"}}>
      <div style={{padding:"14px 14px 12px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:8,background:T.goldDim,border:`1px solid ${T.gold}55`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Building2 size={14} color={T.goldL}/>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:T.text}}>ImovielFI</div>
            <div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>v3.0</div>
          </div>
        </div>
      </div>
      <div style={{padding:"6px 10px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{background:`${r.statusC}18`,border:`1px solid ${r.statusC}33`,borderRadius:6,
          padding:"5px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:10,color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:90}}>{f$(r.VGV)}</span>
          <span style={{fontSize:10,fontWeight:700,color:r.statusC}}>{r.status}</span>
        </div>
      </div>
      <nav style={{flex:1,padding:"4px 0"}}>
        {groups.map(g=>(
          <div key={g}>
            <div style={{fontSize:9,color:T.muted,letterSpacing:"0.07em",textTransform:"uppercase",padding:"8px 12px 3px",fontWeight:600}}>{g}</div>
            {NAVS.filter(n=>n.group===g).map(item=>{
              const act=active===item.id;
              return(
                <button key={item.id} onClick={()=>setActive(item.id)}
                  style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",
                    background:act?T.bBright:"transparent",border:"none",cursor:"pointer",textAlign:"left",
                    borderLeft:act?`2px solid ${T.goldL}`:"2px solid transparent",transition:"all .15s"}}>
                  <item.icon size={13} color={act?T.goldL:T.muted}/>
                  <span style={{fontSize:12,color:act?T.text:T.muted,fontWeight:act?600:400}}>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div style={{padding:"8px 12px",borderTop:`1px solid ${T.border}`}}>
        <div style={{fontSize:9,color:T.muted}}>Almeida Lessa Engenharia</div>
      </div>
    </div>
  );
}

// Mobile Bottom Tab Bar
function MobileTabBar({active,setActive}){
  const tabs=[
    {id:"dashboard",    label:"Home",       icon:LayoutDashboard},
    {id:"produto",      label:"Produto",    icon:Layers},
    {id:"indicadores",  label:"Indicadores",icon:BarChart2},
    {id:"cenarios",     label:"Cenários",   icon:GitCompare},
    {id:"mais",         label:"Mais",       icon:Menu},
  ];
  return(
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:T.surf,
      borderTop:`1px solid ${T.border}`,display:"flex",zIndex:100,
      paddingBottom:"env(safe-area-inset-bottom)"}}>
      {tabs.map(tab=>{
        const act=active===tab.id;
        return(
          <button key={tab.id} onClick={()=>setActive(tab.id)}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              padding:"10px 4px 8px",background:"none",border:"none",cursor:"pointer"}}>
            <tab.icon size={20} color={act?T.goldL:T.muted}/>
            <span style={{fontSize:10,color:act?T.goldL:T.muted,fontWeight:act?600:400}}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Mobile More Menu (drawer)
function MobileDrawer({active,setActive,onClose,r}){
  const extras=NAVS.filter(n=>!["dashboard","produto","indicadores","cenarios"].includes(n.id));
  return(
    <div style={{position:"fixed",inset:0,zIndex:200}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)"}}/>
      <div style={{position:"absolute",bottom:0,left:0,right:0,background:T.surf,
        borderRadius:"16px 16px 0 0",border:`1px solid ${T.border}`,
        paddingBottom:"env(safe-area-inset-bottom)"}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,color:T.text}}>Mais módulos</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.muted}}><X size={18}/></button>
        </div>
        {extras.map(item=>(
          <button key={item.id} onClick={()=>{setActive(item.id);onClose();}}
            style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"14px 20px",
              background:active===item.id?T.bBright:"transparent",border:"none",cursor:"pointer",textAlign:"left",
              borderBottom:`1px solid ${T.border}`}}>
            <item.icon size={18} color={active===item.id?T.goldL:T.sub}/>
            <span style={{fontSize:14,color:active===item.id?T.text:T.sub,fontWeight:active===item.id?600:400}}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App(){
  const [s,setS]=useState(INIT);
  const [active,setActive]=useState("dashboard");
  const [drawerOpen,setDrawerOpen]=useState(false);
  const {isMobile,isTablet}=useBreakpoint();

  useEffect(()=>{
    const style=document.createElement("style");
    style.textContent=`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Inter',sans-serif;background:${T.bg};color:${T.text};line-height:1.5;-webkit-text-size-adjust:100%}
      ::-webkit-scrollbar{width:3px;height:3px}
      ::-webkit-scrollbar-track{background:${T.surf}}
      ::-webkit-scrollbar-thumb{background:${T.bBright};border-radius:2px}
      input,select,button{font-family:'Inter',sans-serif;-webkit-tap-highlight-color:transparent}
      input:focus,select:focus{outline:none;border-color:${T.bBright}!important}
      input[type=number]::-webkit-inner-spin-button{opacity:.4}
      @media(max-width:640px){
        input,select{font-size:16px!important}
      }
    `;
    document.head.appendChild(style);
    // Viewport meta for mobile
    let vm=document.querySelector("meta[name=viewport]");
    if(!vm){vm=document.createElement("meta");vm.name="viewport";document.head.appendChild(vm);}
    vm.content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1";
  },[]);

  const r=useMemo(()=>calcProject(s),[s]);

  // Handle "mais" tab on mobile
  const handleSetActive=(id)=>{
    if(id==="mais"){setDrawerOpen(true);return;}
    setActive(id);
  };

  const renderModule=()=>{
    const props={s,setS,r,isMobile};
    switch(active){
      case "dashboard":     return <Dashboard          {...props}/>;
      case "produto":       return <ProdutoModule      {...props}/>;
      case "custos":        return <CustosModule       {...props}/>;
      case "fluxo":         return <FluxoCaixaModule   {...props}/>;
      case "indicadores":   return <IndicadoresModule  {...props}/>;
      case "cenarios":      return <CenariosModule     {...props}/>;
      case "sensibilidade": return <SensibilidadeModule {...props}/>;
      case "relatorios":    return <RelatoriosModule   {...props}/>;
      case "cadastro_cfg":  return <ConfigModule       {...props}/>;
      default:              return <Dashboard          {...props}/>;
    }
  };

  if(isMobile){
    return(
      <div style={{background:T.bg,minHeight:"100vh",paddingBottom:72}}>
        {/* Mobile topbar */}
        <div style={{position:"sticky",top:0,zIndex:50,background:T.surf,
          borderBottom:`1px solid ${T.border}`,padding:"10px 14px",
          paddingTop:"calc(10px + env(safe-area-inset-top))",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Building2 size={16} color={T.goldL}/>
            <span style={{fontSize:14,fontWeight:800,color:T.text}}>ImovielFI</span>
          </div>
          <div style={{background:r.statusBg,border:`1px solid ${r.statusC}44`,borderRadius:6,padding:"4px 10px"}}>
            <span style={{fontSize:11,fontWeight:700,color:r.statusC}}>{r.status}</span>
          </div>
        </div>
        <div>{renderModule()}</div>
        <MobileTabBar active={active} setActive={handleSetActive}/>
        {drawerOpen&&<MobileDrawer active={active} setActive={setActive} onClose={()=>setDrawerOpen(false)} r={r}/>}
      </div>
    );
  }

  // Desktop
  return(
    <div style={{display:"flex",height:"100vh",background:T.bg,overflow:"hidden"}}>
      <Sidebar active={active} setActive={setActive} r={r}/>
      <div style={{flex:1,overflowY:"auto",background:T.bg}}>{renderModule()}</div>
    </div>
  );
}
