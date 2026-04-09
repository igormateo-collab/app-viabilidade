import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import type { ViabilityIndicators, MonthlyCashFlow, Scenario, UnitType, CostCategory, Enterprise } from "@/data/mockData";

// ─── Dados que os relatórios precisam ─────────────────────────────────────────
export interface ReportData {
  enterprise: Enterprise;
  indicators: ViabilityIndicators;
  unitTypes: UnitType[];
  costCategories: CostCategory[];
  cashFlowData: MonthlyCashFlow[];
  scenarios: Scenario[];
}

// ─── Helpers de formatação ────────────────────────────────────────────────────
const fmt = (v: number) =>
  "R$ " + Math.round(v).toLocaleString("pt-BR");
const pct = (v: number) =>
  (v * 100).toFixed(1).replace(".", ",") + "%";
const dt = new Date().toLocaleDateString("pt-BR");

// ─── PDF helpers ──────────────────────────────────────────────────────────────
function addHeader(doc: jsPDF, title: string, y: number, data: ReportData): number {
  doc.setFillColor(18, 20, 37);
  doc.rect(0, 0, 210, 28, "F");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("PROPALYTICS PRO", 16, 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(data.enterprise.name + " | " + data.enterprise.city, 16, 17);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(title, 16, 24);
  doc.setTextColor(30, 30, 30);
  return y + 18;
}

function addSection(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(230, 232, 255);
  doc.rect(14, y, 182, 7, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 50, 200);
  doc.text(title, 16, y + 5);
  doc.setTextColor(30, 30, 30);
  return y + 10;
}

function addRow(doc: jsPDF, label: string, value: string, y: number): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(label, 16, y);
  doc.setFont("helvetica", "bold");
  doc.text(value, 140, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y + 2, 196, y + 2);
  return y + 7;
}

function addTable(doc: jsPDF, headers: string[], rows: string[][], y: number, widths: number[]): number {
  const startX = 14;
  doc.setFillColor(50, 60, 180);
  doc.rect(startX, y, 182, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  let x = startX + 2;
  headers.forEach((h, i) => { doc.text(h, x, y + 5); x += widths[i]; });
  doc.setTextColor(30, 30, 30);
  y += 9;
  rows.forEach((row, ri) => {
    if (ri % 2 === 0) { doc.setFillColor(245, 245, 250); doc.rect(startX, y - 4, 182, 7, "F"); }
    doc.setFont("helvetica", ri === rows.length - 1 ? "bold" : "normal");
    x = startX + 2;
    row.forEach((cell, i) => { doc.setFontSize(8); doc.text(String(cell), x, y); x += widths[i]; });
    y += 7;
  });
  return y + 3;
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado em ${dt} — Propalytics Pro | Página ${i}/${pages}`, 105, 292, { align: "center" });
  }
}

// ─── Geradores PDF ────────────────────────────────────────────────────────────

function generateExecutivoPDF(data: ReportData) {
  const { indicators, enterprise } = data;
  const doc = new jsPDF();
  let y = 20;
  y = addHeader(doc, "Relatório Executivo de Viabilidade", y, data);
  y = addSection(doc, "Sumário Executivo", y);
  y = addRow(doc, "Empreendimento", enterprise.name, y);
  y = addRow(doc, "Localização", enterprise.city + " — " + enterprise.neighborhood, y);
  y = addRow(doc, "Padrão", enterprise.standard, y);
  y = addRow(doc, "Total de Unidades", String(enterprise.totalUnits), y);
  y = addRow(doc, "Prazo Total", enterprise.totalMonths + " meses", y);
  y += 4;
  y = addSection(doc, "Indicadores Financeiros", y);
  y = addRow(doc, "VGV Total", fmt(indicators.vgv), y);
  y = addRow(doc, "Receita Líquida", fmt(indicators.netRevenue), y);
  y = addRow(doc, "Custo Total", fmt(indicators.totalCost), y);
  y = addRow(doc, "Lucro Líquido", fmt(indicators.netProfit), y);
  y = addRow(doc, "Margem Bruta", pct(indicators.grossMargin), y);
  y = addRow(doc, "Margem Líquida", pct(indicators.netMargin), y);
  y = addRow(doc, "TIR", pct(indicators.irr), y);
  y = addRow(doc, "TIR Alavancada", pct(indicators.leveragedIrr), y);
  y = addRow(doc, "VPL (TMA 12%)", fmt(indicators.npv), y);
  y = addRow(doc, "ROI", pct(indicators.roi), y);
  y = addRow(doc, "ROE", pct(indicators.roe), y);
  y = addRow(doc, "Payback Simples", indicators.simplePayback + " meses", y);
  y = addRow(doc, "Payback Descontado", indicators.discountedPayback + " meses", y);
  y += 4;
  y = addSection(doc, "Exposição de Caixa", y);
  y = addRow(doc, "Exposição Máxima", fmt(indicators.maxCashExposure), y);
  y = addRow(doc, "Capital Necessário", fmt(indicators.capitalNeeded), y);
  y = addRow(doc, "DSCR", indicators.dscr.toFixed(2) + "x", y);
  y = addRow(doc, "Custo/m²", "R$ " + indicators.costPerSqm.toLocaleString("pt-BR"), y);
  y = addRow(doc, "Lucro/m²", "R$ " + indicators.profitPerSqm.toLocaleString("pt-BR"), y);
  footer(doc);
  doc.save("Relatorio_Executivo_" + enterprise.name.replace(/\s+/g, "_") + ".pdf");
}

function generateFluxoCaixaPDF(data: ReportData) {
  const { cashFlowData, enterprise } = data;
  const doc = new jsPDF("landscape");
  let y = 20;
  y = addSection(doc, "Fluxo de Caixa Mensal — " + enterprise.name, y);
  const headers = ["Mês", "Vendas", "Financ.", "Equity", "Terreno", "Obra", "Indir.", "Líquido", "Acumulado"];
  const rows = cashFlowData.map(cf => [
    cf.label,
    fmt(cf.salesInflow),
    fmt(cf.financingInflow),
    fmt(cf.equityInflow),
    fmt(cf.landOutflow),
    fmt(cf.constructionOutflow),
    fmt(cf.indirectOutflow),
    fmt(cf.netFlow),
    fmt(cf.cumulativeFlow),
  ]);
  y = addTable(doc, headers, rows, y, [18, 30, 28, 25, 28, 28, 25, 28, 30]);
  footer(doc);
  doc.save("Fluxo_Caixa_" + enterprise.name.replace(/\s+/g, "_") + ".pdf");
}

function generateCustosPDF(data: ReportData) {
  const { costCategories, enterprise, indicators } = data;
  const doc = new jsPDF();
  let y = 20;
  y = addHeader(doc, "Composição de Custos", y, data);
  y = addSection(doc, "Detalhamento por Categoria", y);
  const headers = ["Grupo", "Categoria", "Valor (R$)", "% Total"];
  const rows: string[][] = costCategories.map(c => [
    c.group, c.category, fmt(c.budgetValue),
    indicators.constructionCost > 0 ? ((c.budgetValue / indicators.constructionCost) * 100).toFixed(1) + "%" : "0%"
  ]);
  rows.push(["", "TOTAL", fmt(indicators.constructionCost), "100%"]);
  y = addTable(doc, headers, rows, y, [50, 65, 40, 27]);
  footer(doc);
  doc.save("Custos_" + enterprise.name.replace(/\s+/g, "_") + ".pdf");
}

function generateComparativoPDF(data: ReportData) {
  const { scenarios, enterprise } = data;
  const doc = new jsPDF();
  let y = 20;
  y = addHeader(doc, "Comparativo de Cenários", y, data);
  y = addSection(doc, "Cenários", y);
  const headers = ["Indicador", "Pessimista", "Base", "Otimista"];
  const [pess, base, opt] = [scenarios[0], scenarios[1], scenarios[2]];
  const rows = [
    ["VGV", fmt(pess.vgv), fmt(base.vgv), fmt(opt.vgv)],
    ["Rec. Líquida", fmt(pess.netRevenue), fmt(base.netRevenue), fmt(opt.netRevenue)],
    ["Lucro Líquido", fmt(pess.netProfit), fmt(base.netProfit), fmt(opt.netProfit)],
    ["Margem Líq.", pct(pess.netMargin), pct(base.netMargin), pct(opt.netMargin)],
    ["TIR", pct(pess.irr), pct(base.irr), pct(opt.irr)],
    ["VPL", fmt(pess.npv), fmt(base.npv), fmt(opt.npv)],
    ["Payback", pess.simplePayback + " m", base.simplePayback + " m", opt.simplePayback + " m"],
    ["ROI", pct(pess.roi), pct(base.roi), pct(opt.roi)],
    ["Exp. Caixa", fmt(pess.maxCashExposure), fmt(base.maxCashExposure), fmt(opt.maxCashExposure)],
  ];
  y = addTable(doc, headers, rows, y, [45, 45, 45, 45]);
  footer(doc);
  doc.save("Cenarios_" + enterprise.name.replace(/\s+/g, "_") + ".pdf");
}

function generateParecerPDF(data: ReportData) {
  const { indicators, enterprise } = data;
  const doc = new jsPDF();
  let y = 20;
  y = addHeader(doc, "Parecer Executivo Final", y, data);
  y = addSection(doc, "Conclusão", y);
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  const viavel = indicators.irr > 0.12 && indicators.npv > 0 && indicators.netMargin > 0;
  const parecer = viavel
    ? `O empreendimento "${enterprise.name}" apresenta viabilidade econômico-financeira POSITIVA. ` +
      `A TIR de ${pct(indicators.irr)} supera a TMA de 12% a.a. O VPL de ${fmt(indicators.npv)} confirma geração de valor. ` +
      `A margem líquida de ${pct(indicators.netMargin)} está dentro dos padrões de mercado. ` +
      `O payback de ${indicators.simplePayback} meses é compatível com o ciclo do projeto. ` +
      `Recomenda-se a aprovação do investimento, com atenção à exposição máxima de caixa de ${fmt(indicators.maxCashExposure)}.`
    : `O empreendimento "${enterprise.name}" apresenta RISCO ELEVADO no cenário base. ` +
      `TIR de ${pct(indicators.irr)} e VPL de ${fmt(indicators.npv)} indicam que o projeto ` +
      `pode não superar o custo de oportunidade. Revisar premissas de preço, custo e velocidade de vendas.`;
  const lines = doc.splitTextToSize(parecer, 175);
  doc.text(lines, 16, y);
  y += lines.length * 5 + 10;
  y = addSection(doc, "Indicadores de Suporte", y);
  y = addRow(doc, "VGV", fmt(indicators.vgv), y);
  y = addRow(doc, "Lucro Líquido", fmt(indicators.netProfit), y);
  y = addRow(doc, "ROI", pct(indicators.roi), y);
  y = addRow(doc, "ROE", pct(indicators.roe), y);
  y = addRow(doc, "DSCR", indicators.dscr.toFixed(2) + "x", y);
  footer(doc);
  doc.save("Parecer_Executivo_" + enterprise.name.replace(/\s+/g, "_") + ".pdf");
}

// ─── Excel ────────────────────────────────────────────────────────────────────
function generateExcel(reportName: string, data: ReportData) {
  const { indicators, unitTypes, costCategories, cashFlowData, enterprise } = data;
  const wb = XLSX.utils.book_new();

  // KPIs
  const kpiData = [
    ["Empreendimento", enterprise.name], ["Cidade", enterprise.city], ["", ""],
    ["Indicador", "Valor"],
    ["VGV Total", indicators.vgv], ["Receita Bruta", indicators.grossRevenue],
    ["Receita Líquida", indicators.netRevenue], ["Custo Total", indicators.totalCost],
    ["Lucro Bruto", indicators.grossProfit], ["Lucro Líquido", indicators.netProfit],
    ["Margem Bruta", indicators.grossMargin], ["Margem Líquida", indicators.netMargin],
    ["TIR", indicators.irr], ["TIR Alavancada", indicators.leveragedIrr],
    ["VPL", indicators.npv], ["ROI", indicators.roi], ["ROE", indicators.roe],
    ["Payback (meses)", indicators.simplePayback], ["Exposição Máxima", indicators.maxCashExposure],
    ["DSCR", indicators.dscr], ["Custo/m²", indicators.costPerSqm],
  ];
  const wsKpi = XLSX.utils.aoa_to_sheet(kpiData);
  wsKpi["!cols"] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsKpi, "KPIs");

  // Produto
  const prodData = [["Tipo", "Qtd", "Área Priv.(m²)", "Preço Unit.", "VGV", "Permuta"], ...unitTypes.map(u => [u.name, u.quantity, u.privateArea, u.unitPrice, u.quantity * u.unitPrice, u.swappedUnits])];
  const wsProd = XLSX.utils.aoa_to_sheet(prodData);
  wsProd["!cols"] = [{ wch: 30 }, { wch: 8 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsProd, "Produto");

  // Custos
  const costData: (string | number)[][] = [["Grupo", "Categoria", "Valor", "% Total"]];
  costCategories.forEach(c => costData.push([c.group, c.category, c.budgetValue, indicators.constructionCost > 0 ? (c.budgetValue / indicators.constructionCost) : 0]));
  costData.push(["", "TOTAL", indicators.constructionCost, 1]);
  const wsCost = XLSX.utils.aoa_to_sheet(costData);
  wsCost["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 18 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsCost, "Custos");

  // Fluxo de Caixa
  const cfData = [["Mês", "Label", "Vendas", "Financ.", "Equity", "Terreno", "Obra", "Indiretos", "Comercial", "Impostos", "Serv.Dívida", "Líquido", "Acumulado"]];
  cashFlowData.forEach(cf => cfData.push([
    cf.month, cf.label, cf.salesInflow, cf.financingInflow, cf.equityInflow,
    cf.landOutflow, cf.constructionOutflow, cf.indirectOutflow, cf.commercialOutflow,
    cf.taxOutflow, cf.financingOutflow, cf.netFlow, cf.cumulativeFlow,
  ]));
  const wsCf = XLSX.utils.aoa_to_sheet(cfData);
  wsCf["!cols"] = Array(13).fill({ wch: 16 });
  XLSX.utils.book_append_sheet(wb, wsCf, "Fluxo de Caixa");

  const fileName = reportName.replace(/\s+/g, "_") + "_" + enterprise.name.replace(/\s+/g, "_");
  XLSX.writeFile(wb, fileName + ".xlsx");
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

const pdfGenerators: Record<string, (data: ReportData) => void> = {
  "Relatório Executivo":    generateExecutivoPDF,
  "Relatório Resumido":     generateExecutivoPDF,
  "Fluxo de Caixa Completo": generateFluxoCaixaPDF,
  "Composição de Custos":   generateCustosPDF,
  "Comparativo de Cenários": generateComparativoPDF,
  "Parecer Executivo Final": generateParecerPDF,
};

export function downloadPDF(reportName: string, data: ReportData) {
  const gen = pdfGenerators[reportName];
  if (gen) gen(data);
  else generateExecutivoPDF(data); // fallback
}

export function downloadExcel(reportName: string, data: ReportData) {
  generateExcel(reportName, data);
}
