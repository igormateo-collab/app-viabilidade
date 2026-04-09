// ============================================================================
// DADOS MOCKADOS REALISTAS - Empreendimento "Residencial Parque das Águas"
// Residencial alto padrão em São Paulo - 2 torres, 120 unidades
// ============================================================================

export interface Enterprise {
  id: string;
  name: string;
  company: string;
  spe: string;
  type: string;
  city: string;
  state: string;
  neighborhood: string;
  address: string;
  standard: string;
  typology: string;
  towers: number;
  blocks: number;
  floors: number;
  totalUnits: number;
  landArea: number;
  builtArea: number;
  privateArea: number;
  commonArea: number;
  sellableArea: number;
  utilizationCoefficient: number;
  occupancyRate: number;
  projectEfficiency: number;
  acquisitionDate: string;
  launchDate: string;
  constructionStart: string;
  deliveryDate: string;
  totalMonths: number;
  status: "planning" | "launched" | "construction" | "delivered";
}

export interface UnitType {
  id: string;
  name: string;
  quantity: number;
  privateArea: number;
  parkingSpots: number;
  unitPrice: number;
  pricePerSqm: number;
  swappedUnits: number;
  blockedUnits: number;
  stockUnits: number;
  sellableUnits: number;
  vgvShare: number;
}

export interface CostCategory {
  id: string;
  category: string;
  group: string;
  budgetValue: number;
  percentOfTotal: number;
}

export interface MonthlyCashFlow {
  month: number;
  label: string;
  landOutflow: number;
  constructionOutflow: number;
  indirectOutflow: number;
  commercialOutflow: number;
  taxOutflow: number;
  financingOutflow: number;
  salesInflow: number;
  financingInflow: number;
  equityInflow: number;
  netFlow: number;
  cumulativeFlow: number;
  physicalProgress: number;
  cumulativePhysical: number;
}

export interface Scenario {
  id: string;
  name: string;
  type: "pessimist" | "base" | "optimist" | "custom";
  priceVariation: number;
  salesSpeedVariation: number;
  constructionCostVariation: number;
  interestRateVariation: number;
  defaultRate: number;
  vgv: number;
  netRevenue: number;
  totalCost: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  irr: number;
  leveragedIrr: number;
  npv: number;
  simplePayback: number;
  discountedPayback: number;
  roi: number;
  roe: number;
  maxCashExposure: number;
  capitalNeeded: number;
}

export interface ViabilityIndicators {
  vgv: number;
  grossRevenue: number;
  netRevenue: number;
  totalCost: number;
  landCost: number;
  acquisitionCost: number;
  constructionCost: number;
  indirectExpenses: number;
  commercialExpenses: number;
  taxes: number;
  financialCost: number;
  contingency: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  irr: number;
  leveragedIrr: number;
  npv: number;
  simplePayback: number;
  discountedPayback: number;
  roi: number;
  roe: number;
  maxCashExposure: number;
  capitalNeeded: number;
  peakNegativeCash: number;
  avgSalesSpeed: number;
  breakEvenPoint: number;
  costPerSqm: number;
  profitPerSqm: number;
  avgTicket: number;
  profitabilityIndex: number;
  dscr: number;
  markup: number;
}

// ============================================================================
// EMPREENDIMENTO
// ============================================================================
export const enterprise: Enterprise = {
  id: "emp-001",
  name: "Residencial Parque das Águas",
  company: "Incorporadora Horizonte S.A.",
  spe: "SPE Parque das Águas Empreendimentos Ltda.",
  type: "Residencial Vertical",
  city: "São Paulo",
  state: "SP",
  neighborhood: "Vila Mariana",
  address: "Rua Domingos de Morais, 2200",
  standard: "Alto Padrão",
  typology: "Apartamentos de 2 e 3 dormitórios",
  towers: 2,
  blocks: 2,
  floors: 25,
  totalUnits: 120,
  landArea: 4500,
  builtArea: 28000,
  privateArea: 14400,
  commonArea: 13600,
  sellableArea: 14400,
  utilizationCoefficient: 6.22,
  occupancyRate: 0.55,
  projectEfficiency: 0.514,
  acquisitionDate: "2024-03-15",
  launchDate: "2024-09-01",
  constructionStart: "2024-11-01",
  deliveryDate: "2027-11-01",
  totalMonths: 44,
  status: "construction",
};

// ============================================================================
// TIPOLOGIAS / UNIDADES
// ============================================================================
export const unitTypes: UnitType[] = [
  {
    id: "ut-001",
    name: "2 Dorms - 68m²",
    quantity: 50,
    privateArea: 68,
    parkingSpots: 1,
    unitPrice: 850000,
    pricePerSqm: 12500,
    swappedUnits: 3,
    blockedUnits: 0,
    stockUnits: 5,
    sellableUnits: 42,
    vgvShare: 0.27,
  },
  {
    id: "ut-002",
    name: "3 Dorms - 95m²",
    quantity: 40,
    privateArea: 95,
    parkingSpots: 2,
    unitPrice: 1350000,
    pricePerSqm: 14210,
    swappedUnits: 2,
    blockedUnits: 0,
    stockUnits: 3,
    sellableUnits: 35,
    vgvShare: 0.35,
  },
  {
    id: "ut-003",
    name: "3 Dorms Suite - 120m²",
    quantity: 20,
    privateArea: 120,
    parkingSpots: 2,
    unitPrice: 1850000,
    pricePerSqm: 15416,
    swappedUnits: 1,
    blockedUnits: 0,
    stockUnits: 2,
    sellableUnits: 17,
    vgvShare: 0.24,
  },
  {
    id: "ut-004",
    name: "Cobertura Duplex - 180m²",
    quantity: 10,
    privateArea: 180,
    parkingSpots: 3,
    unitPrice: 3200000,
    pricePerSqm: 17777,
    swappedUnits: 0,
    blockedUnits: 0,
    stockUnits: 1,
    sellableUnits: 9,
    vgvShare: 0.14,
  },
];

// ============================================================================
// CUSTOS DE CONSTRUÇÃO E INCORPORAÇÃO
// ============================================================================
export const costCategories: CostCategory[] = [
  { id: "c-01", category: "Terraplenagem", group: "Fundação", budgetValue: 1200000, percentOfTotal: 1.4 },
  { id: "c-02", category: "Fundação", group: "Fundação", budgetValue: 4800000, percentOfTotal: 5.5 },
  { id: "c-03", category: "Contenção", group: "Fundação", budgetValue: 1800000, percentOfTotal: 2.1 },
  { id: "c-04", category: "Estrutura", group: "Estrutura", budgetValue: 18500000, percentOfTotal: 21.2 },
  { id: "c-05", category: "Alvenaria", group: "Vedação", budgetValue: 5200000, percentOfTotal: 6.0 },
  { id: "c-06", category: "Instalações Elétricas", group: "Instalações", budgetValue: 4100000, percentOfTotal: 4.7 },
  { id: "c-07", category: "Instalações Hidráulicas", group: "Instalações", budgetValue: 3800000, percentOfTotal: 4.4 },
  { id: "c-08", category: "Gás e Incêndio", group: "Instalações", budgetValue: 1500000, percentOfTotal: 1.7 },
  { id: "c-09", category: "Elevadores", group: "Equipamentos", budgetValue: 3200000, percentOfTotal: 3.7 },
  { id: "c-10", category: "Fachadas", group: "Acabamento", budgetValue: 6800000, percentOfTotal: 7.8 },
  { id: "c-11", category: "Esquadrias", group: "Acabamento", budgetValue: 3500000, percentOfTotal: 4.0 },
  { id: "c-12", category: "Impermeabilização", group: "Acabamento", budgetValue: 1900000, percentOfTotal: 2.2 },
  { id: "c-13", category: "Revestimentos", group: "Acabamento", budgetValue: 5500000, percentOfTotal: 6.3 },
  { id: "c-14", category: "Pintura", group: "Acabamento", budgetValue: 2800000, percentOfTotal: 3.2 },
  { id: "c-15", category: "Louças e Metais", group: "Acabamento", budgetValue: 2200000, percentOfTotal: 2.5 },
  { id: "c-16", category: "Áreas Comuns / Lazer", group: "Comum", budgetValue: 4500000, percentOfTotal: 5.2 },
  { id: "c-17", category: "Paisagismo", group: "Comum", budgetValue: 1200000, percentOfTotal: 1.4 },
  { id: "c-18", category: "Projetos Executivos", group: "Projetos", budgetValue: 2800000, percentOfTotal: 3.2 },
  { id: "c-19", category: "Gerenciamento", group: "Administração", budgetValue: 3500000, percentOfTotal: 4.0 },
  { id: "c-20", category: "Canteiro e Segurança", group: "Administração", budgetValue: 2100000, percentOfTotal: 2.4 },
  { id: "c-21", category: "Seguros", group: "Administração", budgetValue: 800000, percentOfTotal: 0.9 },
  { id: "c-22", category: "Assistência Técnica", group: "Pós-obra", budgetValue: 600000, percentOfTotal: 0.7 },
  { id: "c-23", category: "Contingência Técnica", group: "Contingência", budgetValue: 4300000, percentOfTotal: 4.9 },
];

// ============================================================================
// INDICADORES DE VIABILIDADE (cenário base)
// ============================================================================
export const indicators: ViabilityIndicators = {
  vgv: 154200000,
  grossRevenue: 148032000,
  netRevenue: 133228800,
  totalCost: 107383000,
  landCost: 18500000,
  acquisitionCost: 21830000,
  constructionCost: 87200000,
  indirectExpenses: 8200000,
  commercialExpenses: 9620000,
  taxes: 7401600,
  financialCost: 4680000,
  contingency: 4300000,
  grossProfit: 31245800,
  netProfit: 25845800,
  grossMargin: 0.2346,
  netMargin: 0.1940,
  irr: 0.2240,
  leveragedIrr: 0.3180,
  npv: 14520000,
  simplePayback: 28,
  discountedPayback: 33,
  roi: 0.2408,
  roe: 0.3920,
  maxCashExposure: 38500000,
  capitalNeeded: 42000000,
  peakNegativeCash: -38500000,
  avgSalesSpeed: 3.5,
  breakEvenPoint: 72,
  costPerSqm: 7457,
  profitPerSqm: 1795,
  avgTicket: 1285000,
  profitabilityIndex: 1.24,
  dscr: 1.85,
  markup: 0.3114,
};

// ============================================================================
// TERRENO / AQUISIÇÃO
// ============================================================================
export const landAcquisition = {
  landValue: 18500000,
  acquisitionType: "Parcelada com Permuta Física",
  downPayment: 5550000,
  installments: 12,
  installmentValue: 679166,
  physicalSwapPercent: 5,
  physicalSwapUnits: 6,
  financialSwapPercent: 0,
  brokerageOnAcquisition: 370000,
  dueDiligence: 85000,
  notaryCosts: 120000,
  itbi: 555000,
  registration: 45000,
  legalFees: 180000,
  evictionCost: 0,
  demolitionCost: 350000,
  regularizationCost: 95000,
  approvalCost: 280000,
  licensingCost: 165000,
  soilSurvey: 45000,
  preliminaryStudies: 120000,
  initialConsulting: 90000,
  totalAcquisitionCost: 21830000,
  costPerSqmLand: 4111,
  costPerSqmPrivate: 1516,
  impactOnVgv: 0.1416,
  impactOnMargin: -0.042,
};

// ============================================================================
// DESPESAS INDIRETAS
// ============================================================================
export const indirectExpenses = [
  { category: "Administrativas", value: 1800000, percent: 21.9 },
  { category: "Equipe Própria", value: 1200000, percent: 14.6 },
  { category: "Jurídico", value: 450000, percent: 5.5 },
  { category: "Contabilidade e Auditoria", value: 280000, percent: 3.4 },
  { category: "Marketing Institucional", value: 850000, percent: 10.4 },
  { category: "Campanha de Lançamento", value: 1200000, percent: 14.6 },
  { category: "Stand de Vendas", value: 650000, percent: 7.9 },
  { category: "Apartamento Decorado", value: 420000, percent: 5.1 },
  { category: "Mídia Digital + Performance", value: 580000, percent: 7.1 },
  { category: "Overhead Corporativo", value: 520000, percent: 6.3 },
  { category: "Consultoria e Gestão", value: 250000, percent: 3.0 },
];

// ============================================================================
// CENÁRIOS
// ============================================================================
export const scenarios: Scenario[] = [
  {
    id: "sc-pessimist",
    name: "Pessimista",
    type: "pessimist",
    priceVariation: -10,
    salesSpeedVariation: -30,
    constructionCostVariation: 15,
    interestRateVariation: 20,
    defaultRate: 8,
    vgv: 138780000,
    netRevenue: 117963000,
    totalCost: 117690000,
    grossProfit: 5673000,
    netProfit: 273000,
    grossMargin: 0.0481,
    netMargin: 0.0023,
    irr: 0.035,
    leveragedIrr: 0.048,
    npv: -4200000,
    simplePayback: 42,
    discountedPayback: 48,
    roi: 0.0025,
    roe: 0.0041,
    maxCashExposure: 52000000,
    capitalNeeded: 58000000,
  },
  {
    id: "sc-base",
    name: "Base",
    type: "base",
    priceVariation: 0,
    salesSpeedVariation: 0,
    constructionCostVariation: 0,
    interestRateVariation: 0,
    defaultRate: 3,
    vgv: 154200000,
    netRevenue: 133228800,
    totalCost: 107383000,
    grossProfit: 31245800,
    netProfit: 25845800,
    grossMargin: 0.2346,
    netMargin: 0.1940,
    irr: 0.2240,
    leveragedIrr: 0.3180,
    npv: 14520000,
    simplePayback: 28,
    discountedPayback: 33,
    roi: 0.2408,
    roe: 0.3920,
    maxCashExposure: 38500000,
    capitalNeeded: 42000000,
  },
  {
    id: "sc-optimist",
    name: "Otimista",
    type: "optimist",
    priceVariation: 8,
    salesSpeedVariation: 20,
    constructionCostVariation: -5,
    interestRateVariation: -10,
    defaultRate: 1,
    vgv: 166536000,
    netRevenue: 149882400,
    totalCost: 101014000,
    grossProfit: 53168400,
    netProfit: 48868400,
    grossMargin: 0.3548,
    netMargin: 0.3261,
    irr: 0.3850,
    leveragedIrr: 0.5200,
    npv: 32800000,
    simplePayback: 22,
    discountedPayback: 25,
    roi: 0.4835,
    roe: 0.7410,
    maxCashExposure: 28000000,
    capitalNeeded: 31000000,
  },
];

// ============================================================================
// FLUXO DE CAIXA MENSAL (44 meses, simplificado)
// ============================================================================
function generateCashFlow(): MonthlyCashFlow[] {
  const months: MonthlyCashFlow[] = [];
  let cumulative = 0;
  const totalMonths = 44;

  for (let m = 1; m <= totalMonths; m++) {
    const label = `M${m}`;
    
    // Land outflow concentrated in first 12 months
    const landOutflow = m <= 1 ? 5550000 : m <= 12 ? 679166 : 0;
    
    // Construction follows S-curve
    const t = m / totalMonths;
    const sCurve = 1 / (1 + Math.exp(-12 * (t - 0.4)));
    const prevS = 1 / (1 + Math.exp(-12 * ((m - 1) / totalMonths - 0.4)));
    const constructionShare = sCurve - prevS;
    const constructionOutflow = Math.round(87200000 * constructionShare);
    
    // Indirect/commercial spread
    const indirectOutflow = Math.round(8200000 / totalMonths);
    const commercialOutflow = m >= 4 && m <= 38 ? Math.round(9620000 / 34) : 0;
    
    // Taxes on revenue
    const taxRate = 0.0555;
    
    // Sales inflow: starts at launch (month 6), S-curve absorption
    let salesInflow = 0;
    if (m >= 6) {
      const salesT = (m - 6) / (totalMonths - 6);
      const salesCurve = 1 / (1 + Math.exp(-8 * (salesT - 0.35)));
      const prevSales = 1 / (1 + Math.exp(-8 * ((m - 7) / (totalMonths - 6) - 0.35)));
      salesInflow = Math.round(148032000 * Math.max(0, salesCurve - prevSales));
    }
    
    const taxOutflow = Math.round(salesInflow * taxRate);
    
    // Financing inflow: months 8-30
    const financingInflow = m >= 8 && m <= 30 ? Math.round(45000000 / 22) : 0;
    const financingOutflow = m >= 20 ? Math.round(4680000 / (totalMonths - 19)) : 0;
    
    // Equity injection in early months
    const equityInflow = m <= 6 ? Math.round(15000000 / 6) : 0;
    
    const totalOutflow = landOutflow + constructionOutflow + indirectOutflow + commercialOutflow + taxOutflow + financingOutflow;
    const totalInflow = salesInflow + financingInflow + equityInflow;
    const netFlow = totalInflow - totalOutflow;
    cumulative += netFlow;
    
    // Physical progress
    const physicalProgress = Math.round(sCurve * 100 * 10) / 10;
    const cumulativePhysical = physicalProgress;
    
    months.push({
      month: m,
      label,
      landOutflow,
      constructionOutflow,
      indirectOutflow,
      commercialOutflow,
      taxOutflow,
      financingOutflow,
      salesInflow,
      financingInflow,
      equityInflow,
      netFlow,
      cumulativeFlow: cumulative,
      physicalProgress: Math.round((sCurve - prevS) * 100 * 10) / 10,
      cumulativePhysical,
    });
  }
  
  return months;
}

export const cashFlowData = generateCashFlow();

// ============================================================================
// SENSIBILIDADE
// ============================================================================
export const sensitivityData = {
  tornado: [
    { variable: "Preço de Venda", impact: 28500000, direction: "positive" as const },
    { variable: "Custo de Construção", impact: -18200000, direction: "negative" as const },
    { variable: "Velocidade de Vendas", impact: 12800000, direction: "positive" as const },
    { variable: "Taxa de Juros", impact: -8500000, direction: "negative" as const },
    { variable: "Custo do Terreno", impact: -6200000, direction: "negative" as const },
    { variable: "Distratos", impact: -5100000, direction: "negative" as const },
    { variable: "INCC", impact: -4800000, direction: "negative" as const },
    { variable: "Prazo de Obra", impact: -3200000, direction: "negative" as const },
  ],
  monteCarloIRR: [
    { range: "< 5%", probability: 5 },
    { range: "5-10%", probability: 8 },
    { range: "10-15%", probability: 15 },
    { range: "15-20%", probability: 25 },
    { range: "20-25%", probability: 22 },
    { range: "25-30%", probability: 15 },
    { range: "30-35%", probability: 7 },
    { range: "> 35%", probability: 3 },
  ],
  monteCarloNPV: [
    { range: "< -5M", probability: 4 },
    { range: "-5 a 0", probability: 7 },
    { range: "0 a 5M", probability: 12 },
    { range: "5 a 10M", probability: 20 },
    { range: "10 a 15M", probability: 24 },
    { range: "15 a 20M", probability: 18 },
    { range: "20 a 30M", probability: 10 },
    { range: "> 30M", probability: 5 },
  ],
};

// ============================================================================
// TRIBUTOS
// ============================================================================
export const taxConfig = {
  regime: "RET - Regime Especial de Tributação",
  spe: true,
  retRate: 0.04,
  pis: 0.0165,
  cofins: 0.076,
  irpj: 0.15,
  csll: 0.09,
  iss: 0.05,
  itbi: 0.03,
  approvalFees: 280000,
  notaryFees: 165000,
  registrationFees: 120000,
  totalTaxOnRevenue: 7401600,
  effectiveRate: 0.0555,
};

// ============================================================================
// FINANCIAMENTO
// ============================================================================
export const financing = {
  ownCapital: 42000000,
  initialEquity: 15000000,
  capitalCalls: 27000000,
  productionFinancing: 45000000,
  interestRate: 0.1150,
  iof: 680000,
  tac: 450000,
  gracePeriod: 12,
  amortizationMonths: 24,
  releaseScheduleMonths: 22,
  guarantees: "Hipoteca do terreno + cessão fiduciária de recebíveis",
  maxDebt: 45000000,
  totalFinancialCost: 4680000,
  leverageRatio: 0.517,
  ownVsThird: "48.3% / 51.7%",
  debtImpactOnIrr: 0.094,
  debtImpactOnProfit: -4680000,
  dscr: 1.85,
};

// ============================================================================
// HELPERS
// ============================================================================
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return (value * 100).toFixed(2) + "%";
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function getViabilityStatus(margin: number, irr: number, npv: number): {
  status: "excellent" | "viable" | "attention" | "inviable";
  label: string;
  color: string;
} {
  if (margin > 0.20 && irr > 0.20 && npv > 0) {
    return { status: "excellent", label: "Excelente", color: "success" };
  }
  if (margin > 0.12 && irr > 0.12 && npv > 0) {
    return { status: "viable", label: "Viável", color: "info" };
  }
  if (margin > 0.05 && irr > 0.05) {
    return { status: "attention", label: "Atenção", color: "warning" };
  }
  return { status: "inviable", label: "Inviável", color: "destructive" };
}

export function getStatusConfig(status: string) {
  switch (status) {
    case "excellent": return { bg: "bg-success/10", text: "text-success", border: "border-success/30" };
    case "viable": return { bg: "bg-info/10", text: "text-info", border: "border-info/30" };
    case "attention": return { bg: "bg-warning/10", text: "text-warning", border: "border-warning/30" };
    case "inviable": return { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30" };
    default: return { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
  }
}
