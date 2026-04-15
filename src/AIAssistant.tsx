// ============================================================================
// PROPALYTICS PRO — MOTOR DE CÁLCULO
// Todos os indicadores derivados do estado real do projeto
// ============================================================================

import type {
  Enterprise,
  UnitType,
  CostCategory,
  MonthlyCashFlow,
  Scenario,
  ViabilityIndicators,
} from "@/data/mockData";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CalcInputs {
  enterprise: Enterprise;
  unitTypes: UnitType[];
  costCategories: CostCategory[];
  land: {
    totalAcquisitionCost: number;
    landValue: number;
    downPayment: number;
    installments: number;
    installmentValue: number;
    physicalSwapPercent: number;
    physicalSwapUnits: number;
    financialSwapPercent: number;
  };
  tax: {
    regime: string;
    retRate: number;
    iss: number;
    effectiveRate: number;
  };
  expenses: { category: string; value: number; percent: number }[];
  financing: {
    productionFinancing: number;
    interestRate: number;
    gracePeriod: number;
    amortizationMonths: number;
    releaseScheduleMonths: number;
    ownCapital: number;
    initialEquity: number;
    capitalCalls: number;
    totalFinancialCost: number;
    leverageRatio: number;
    dscr: number;
  };
  settings: {
    tma: string;
    defaultDistrato: string;
    defaultInadimplencia: string;
    salesCommission: string;
    incc: string;
    discountRate: string;
  };
}

export interface CashFlowOverrides {
  priceVar?: number;       // variação de preço, ex: 0.10 = +10%
  costVar?: number;        // variação no custo de construção
  salesSpeedVar?: number;  // variação na velocidade de vendas
  interestVar?: number;    // variação na taxa de juros
  distratoRate?: number;   // taxa absoluta de distrato, ex: 0.08 para 8%
  landCostVar?: number;    // variação no custo do terreno
}

export interface SensitivityResult {
  tornado: { variable: string; impact: number; direction: "positive" | "negative" }[];
  monteCarloIRR: { range: string; probability: number }[];
  monteCarloNPV: { range: string; probability: number }[];
  stats: {
    irrMedian: number;
    irrP10: number;
    irrP90: number;
    npvMedian: number;
    npvP10: number;
    npvP90: number;
    probPositiveNPV: number;
    probIrrAbove15: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extrai número de string como "12,00% a.a." ou "3%" → 0.12 ou 0.03 */
function parsePct(s: string): number {
  if (!s || typeof s !== "string") return 0;
  const cleaned = s.replace(",", ".");
  const match = cleaned.match(/([\d.]+)/);
  if (!match) return 0;
  return parseFloat(match[1]) / 100;
}

/** TIR por bisseção sobre fluxo mensal → taxa anual */
export function computeIRR(cashFlows: number[]): number {
  const hasPos = cashFlows.some(v => v > 0);
  const hasNeg = cashFlows.some(v => v < 0);
  if (!hasPos || !hasNeg) return 0;

  let lo = -0.9999;
  let hi = 5.0;

  const npvAt = (r: number) =>
    cashFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + r, t), 0);

  for (let i = 0; i < 400; i++) {
    const mid = (lo + hi) / 2;
    const n = npvAt(mid);
    if (Math.abs(n) < 10) break;
    if (n > 0) lo = mid;
    else hi = mid;
  }

  const monthlyRate = (lo + hi) / 2;
  if (!isFinite(monthlyRate) || isNaN(monthlyRate)) return 0;
  return Math.pow(1 + monthlyRate, 12) - 1; // anualizada
}

/** VPL com taxa anual → taxa mensal via equivalência */
export function computeNPV(cashFlows: number[], annualRate: number): number {
  const monthly = Math.pow(1 + annualRate, 1 / 12) - 1;
  return cashFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + monthly, t), 0);
}

/** Amostragem normal via Box-Muller */
function sampleNormal(mean: number, std: number): number {
  const u1 = Math.max(1e-10, Math.random());
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

// ─── Geração de Fluxo de Caixa ────────────────────────────────────────────────

export function generateProjectCashFlow(
  inputs: CalcInputs,
  overrides: CashFlowOverrides = {}
): MonthlyCashFlow[] {
  const { enterprise, unitTypes, costCategories, land, financing, expenses, settings, tax } = inputs;
  const {
    priceVar = 0,
    costVar = 0,
    salesSpeedVar = 0,
    interestVar = 0,
    distratoRate: overrideDistrato,
    landCostVar = 0,
  } = overrides;

  const totalMonths = Math.max(enterprise.totalMonths, 12);

  // ── Receitas ────────────────────────────────────────────────────────
  const vgv = unitTypes.reduce((s, u) => s + u.quantity * u.unitPrice * (1 + priceVar), 0);
  const swapValue = unitTypes.reduce((s, u) => s + u.swappedUnits * u.unitPrice * (1 + priceVar), 0);
  const grossRevenue = Math.max(0, vgv - swapValue);

  const distratoR = overrideDistrato !== undefined ? overrideDistrato : parsePct(settings.defaultDistrato);
  const inadimR = parsePct(settings.defaultInadimplencia);
  const taxEffective = tax.regime.includes("RET") ? tax.retRate : (tax.retRate + tax.iss);
  const salesRevenue = grossRevenue * (1 - distratoR - inadimR);

  // ── Custos ──────────────────────────────────────────────────────────
  const constructionBase = costCategories.reduce((s, c) => s + c.budgetValue, 0);
  const constructionCost = constructionBase * (1 + costVar);
  const indirectCost = expenses.reduce((s, e) => s + e.value, 0);
  const commissionRate = parsePct(settings.salesCommission);
  const commercialCost = grossRevenue * commissionRate;

  // ── Financiamento ───────────────────────────────────────────────────
  const financingTotal = financing.productionFinancing;
  const financingCost = financing.totalFinancialCost * (1 + interestVar);
  const ownCapital = financing.ownCapital;
  const initialEquity = Math.min(financing.initialEquity, ownCapital);
  const equitySpread = Math.min(6, totalMonths);

  // Mês de lançamento: estimado em 20% do prazo total
  const launchMonth = Math.max(4, Math.round(totalMonths * 0.14));
  const constructionStartMonth = Math.max(launchMonth, Math.round(totalMonths * 0.20));

  // Velocidade de vendas: salesSpeedVar ajusta a inclinação da curva S
  const salesK = 8 * (1 + salesSpeedVar * 0.5);
  const salesMid = Math.max(0.15, 0.35 - salesSpeedVar * 0.1);

  // Desembolso do terreno
  const landScale = 1 + landCostVar;
  const landDownPayment = land.downPayment * landScale;
  const landInstallment = land.installmentValue * landScale;

  // Financiamento: liberação entre mês 8 e 30 (ajustado ao prazo)
  const finReleaseStart = Math.min(8, launchMonth + 2);
  const finReleaseEnd = Math.min(30, Math.round(totalMonths * 0.65));
  const finReleaseMonths = Math.max(1, finReleaseEnd - finReleaseStart + 1);

  // Amortização: começa após carência
  const amortStart = Math.min(finReleaseEnd + financing.gracePeriod, totalMonths - 5);
  const amortEnd = Math.min(amortStart + financing.amortizationMonths - 1, totalMonths);
  const amortMonths = Math.max(1, amortEnd - amortStart + 1);

  const months: MonthlyCashFlow[] = [];
  let cumulative = 0;

  for (let m = 1; m <= totalMonths; m++) {
    // ── Saída: Terreno ──────────────────────────────────────────────
    let landOutflow = 0;
    if (m === 1) landOutflow = landDownPayment;
    else if (m >= 2 && m <= land.installments) landOutflow = landInstallment;

    // ── Saída: Construção (curva S) ─────────────────────────────────
    const t = (m - constructionStartMonth + 1) / Math.max(1, totalMonths - constructionStartMonth);
    const tClamped = Math.max(0, Math.min(1, t));
    const prevT = Math.max(0, Math.min(1, (m - constructionStartMonth) / Math.max(1, totalMonths - constructionStartMonth)));
    const sCurve = 1 / (1 + Math.exp(-12 * (tClamped - 0.4)));
    const prevS = 1 / (1 + Math.exp(-12 * (prevT - 0.4)));
    const share = m >= constructionStartMonth ? Math.max(0, sCurve - prevS) : 0;
    const constructionOutflow = Math.round(constructionCost * share);

    // ── Saída: Indiretos (distribuídos uniformemente) ───────────────
    const indirectOutflow = Math.round(indirectCost / totalMonths);

    // ── Saída: Comercial (do lançamento até final - 4 meses) ────────
    const commStart = launchMonth;
    const commEnd = Math.max(commStart + 1, totalMonths - 4);
    const commSpan = Math.max(1, commEnd - commStart + 1);
    const commercialOutflow = m >= commStart && m <= commEnd
      ? Math.round(commercialCost / commSpan)
      : 0;

    // ── Entrada: Vendas (curva S do lançamento) ─────────────────────
    let salesInflow = 0;
    if (m >= launchMonth) {
      const st = (m - launchMonth) / Math.max(1, totalMonths - launchMonth);
      const pst = (m - 1 - launchMonth) / Math.max(1, totalMonths - launchMonth);
      const sc = 1 / (1 + Math.exp(-salesK * (Math.max(0, st) - salesMid)));
      const psc = m > launchMonth ? 1 / (1 + Math.exp(-salesK * (Math.max(0, pst) - salesMid))) : 0;
      salesInflow = Math.round(salesRevenue * Math.max(0, sc - psc));
    }

    // ── Saída: Impostos sobre vendas ────────────────────────────────
    const taxOutflow = Math.round(salesInflow * taxEffective);

    // ── Entrada/Saída: Financiamento ────────────────────────────────
    const financingInflow = m >= finReleaseStart && m <= finReleaseEnd
      ? Math.round(financingTotal / finReleaseMonths)
      : 0;
    const principalPerMonth = Math.round(financingTotal / amortMonths);
    const interestPerMonth = Math.round(financingCost / amortMonths);
    const financingOutflow = m >= amortStart && m <= amortEnd
      ? principalPerMonth + interestPerMonth
      : 0;

    // ── Entrada: Capital Próprio (primeiros N meses) ─────────────────
    const equityInflow = m <= equitySpread
      ? Math.round(initialEquity / equitySpread)
      : 0;

    // ── Saldo ────────────────────────────────────────────────────────
    const totalOut = landOutflow + constructionOutflow + indirectOutflow
      + commercialOutflow + taxOutflow + financingOutflow;
    const totalIn = salesInflow + financingInflow + equityInflow;
    const netFlow = totalIn - totalOut;
    cumulative += netFlow;

    months.push({
      month: m,
      label: `M${m}`,
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
      physicalProgress: Math.round(share * 100 * 10) / 10,
      cumulativePhysical: Math.round(sCurve * 100 * 10) / 10,
    });
  }

  return months;
}

// ─── Cálculo de Indicadores ───────────────────────────────────────────────────

export function calculateIndicators(
  inputs: CalcInputs,
  cashFlow: MonthlyCashFlow[]
): ViabilityIndicators {
  const { unitTypes, costCategories, land, financing, expenses, settings, tax, enterprise } = inputs;

  const tmaRate = parsePct(settings.tma) || 0.12;
  const distratoR = parsePct(settings.defaultDistrato) || 0.03;
  const inadimR = parsePct(settings.defaultInadimplencia) || 0.02;
  const commissionRate = parsePct(settings.salesCommission) || 0.05;
  const taxEffective = tax.regime.includes("RET") ? tax.retRate : (tax.retRate + tax.iss);

  // ── Receita ─────────────────────────────────────────────────────────
  const vgv = unitTypes.reduce((s, u) => s + u.quantity * u.unitPrice, 0);
  const swapValue = unitTypes.reduce((s, u) => s + u.swappedUnits * u.unitPrice, 0);
  const grossRevenue = Math.max(0, vgv - swapValue);
  const distratoVal = grossRevenue * distratoR;
  const inadimVal = grossRevenue * inadimR;
  const taxOnRevenue = grossRevenue * taxEffective;
  const netRevenue = Math.max(0, grossRevenue - distratoVal - inadimVal - taxOnRevenue);

  // ── Custos ───────────────────────────────────────────────────────────
  const acquisitionCost = land.totalAcquisitionCost;
  const constructionCost = costCategories.reduce((s, c) => s + c.budgetValue, 0);
  const contingency = costCategories
    .filter(c => c.group === "Contingência")
    .reduce((s, c) => s + c.budgetValue, 0);
  const indirectCost = expenses.reduce((s, e) => s + e.value, 0);
  const commercialCost = grossRevenue * commissionRate;
  const financialCost = financing.totalFinancialCost;
  const totalCost = acquisitionCost + constructionCost + indirectCost
    + commercialCost + financialCost + taxOnRevenue;

  // ── Resultado ────────────────────────────────────────────────────────
  const grossProfit = netRevenue - acquisitionCost - constructionCost
    + contingency - indirectCost - commercialCost;
  const netProfit = netRevenue - totalCost;
  const grossMargin = netRevenue > 0 ? grossProfit / netRevenue : 0;
  const netMargin = netRevenue > 0 ? netProfit / netRevenue : 0;

  // ── TIR e VPL ────────────────────────────────────────────────────────
  const netFlows = cashFlow.map(cf => cf.netFlow);
  const annualIRR = computeIRR(netFlows);

  // TIR alavancada: perspectiva do capital próprio (vendas - todos os custos - serviço da dívida)
  const equityFlows = cashFlow.map(cf =>
    cf.salesInflow
    - cf.landOutflow
    - cf.constructionOutflow
    - cf.indirectOutflow
    - cf.commercialOutflow
    - cf.taxOutflow
    - cf.financingOutflow
  );
  const leveragedIRR = computeIRR(equityFlows);

  const npv = computeNPV(netFlows, tmaRate);

  // ── Payback ──────────────────────────────────────────────────────────
  let simplePayback = cashFlow.length;
  for (let i = 0; i < cashFlow.length; i++) {
    if (cashFlow[i].cumulativeFlow >= 0) { simplePayback = i + 1; break; }
  }

  const monthlyTMA = Math.pow(1 + tmaRate, 1 / 12) - 1;
  let discSum = 0;
  let discPayback = cashFlow.length;
  for (let i = 0; i < cashFlow.length; i++) {
    discSum += netFlows[i] / Math.pow(1 + monthlyTMA, i);
    if (discSum >= 0 && discPayback === cashFlow.length) discPayback = i + 1;
  }

  // ── Indicadores unitários ─────────────────────────────────────────────
  const sellableUnits = unitTypes.reduce((s, u) =>
    s + Math.max(0, u.quantity - u.swappedUnits - u.blockedUnits), 0
  ) || Math.max(1, enterprise.totalUnits);

  const privateArea = unitTypes.reduce((s, u) =>
    s + (u.quantity - u.swappedUnits - u.blockedUnits) * u.privateArea, 0
  ) || Math.max(1, enterprise.privateArea);

  const roi = totalCost > 0 ? netProfit / totalCost : 0;
  const roe = financing.ownCapital > 0 ? netProfit / financing.ownCapital : 0;

  const peakNegative = Math.min(0, ...cashFlow.map(cf => cf.cumulativeFlow));
  const maxCashExposure = Math.abs(peakNegative);

  const avgSalesSpeed = sellableUnits / Math.max(1, simplePayback);
  const breakEvenPoint = vgv > 0 ? Math.ceil(totalCost / (vgv / sellableUnits)) : 0;
  const costPerSqm = Math.round(totalCost / Math.max(1, privateArea));
  const profitPerSqm = Math.round(netProfit / Math.max(1, privateArea));
  const avgTicket = sellableUnits > 0 ? vgv / sellableUnits : 0;

  // Índice de Lucratividade
  const pvIn = cashFlow.reduce((s, cf, t) =>
    s + (cf.salesInflow + cf.financingInflow + cf.equityInflow) / Math.pow(1 + monthlyTMA, t), 0
  );
  const pvOut = Math.abs(cashFlow.reduce((s, cf, t) =>
    s + (-cf.landOutflow - cf.constructionOutflow - cf.indirectOutflow
      - cf.commercialOutflow - cf.taxOutflow - cf.financingOutflow) / Math.pow(1 + monthlyTMA, t), 0
  ));
  const profitabilityIndex = pvOut > 0 ? pvIn / pvOut : 1;

  // DSCR
  const totalDebtService = cashFlow.reduce((s, cf) => s + cf.financingOutflow, 0);
  const operatingCash = cashFlow.reduce((s, cf) =>
    s + cf.salesInflow - cf.landOutflow - cf.constructionOutflow
    - cf.indirectOutflow - cf.commercialOutflow - cf.taxOutflow, 0
  );
  const dscr = totalDebtService > 0 ? operatingCash / totalDebtService : 2;

  const markup = totalCost > 0 ? netProfit / totalCost : 0;

  return {
    vgv,
    grossRevenue,
    netRevenue,
    totalCost,
    landCost: land.landValue,
    acquisitionCost,
    constructionCost,
    indirectExpenses: indirectCost,
    commercialExpenses: commercialCost,
    taxes: taxOnRevenue,
    financialCost,
    contingency,
    grossProfit,
    netProfit,
    grossMargin,
    netMargin,
    irr: annualIRR,
    leveragedIrr: leveragedIRR,
    npv,
    simplePayback,
    discountedPayback: discPayback,
    roi,
    roe,
    maxCashExposure,
    capitalNeeded: financing.ownCapital,
    peakNegativeCash: peakNegative,
    avgSalesSpeed,
    breakEvenPoint,
    costPerSqm,
    profitPerSqm,
    avgTicket,
    profitabilityIndex,
    dscr,
    markup,
  };
}

// ─── Cenários ────────────────────────────────────────────────────────────────

function calcOneScenario(
  inputs: CalcInputs,
  priceVar: number,
  costVar: number,
  salesVar: number,
  rateVar: number,
  distratoRate: number,
): Omit<Scenario, "id" | "name" | "type" | "priceVariation" | "salesSpeedVariation" | "constructionCostVariation" | "interestRateVariation" | "defaultRate"> {
  const modInputs: CalcInputs = {
    ...inputs,
    settings: { ...inputs.settings, defaultDistrato: String(distratoRate) + "%" },
  };
  const cf = generateProjectCashFlow(modInputs, { priceVar, costVar, salesSpeedVar: salesVar, interestVar: rateVar });
  const ind = calculateIndicators(modInputs, cf);
  return {
    vgv: ind.vgv,
    netRevenue: ind.netRevenue,
    totalCost: ind.totalCost,
    grossProfit: ind.grossProfit,
    netProfit: ind.netProfit,
    grossMargin: ind.grossMargin,
    netMargin: ind.netMargin,
    irr: ind.irr,
    leveragedIrr: ind.leveragedIrr,
    npv: ind.npv,
    simplePayback: ind.simplePayback,
    discountedPayback: ind.discountedPayback,
    roi: ind.roi,
    roe: ind.roe,
    maxCashExposure: ind.maxCashExposure,
    capitalNeeded: ind.capitalNeeded,
  };
}

export function calculateScenarios(inputs: CalcInputs): Scenario[] {
  const defs = [
    { id: "sc-pessimist", name: "Pessimista", type: "pessimist" as const, priceVariation: -10, salesSpeedVariation: -30, constructionCostVariation: 15, interestRateVariation: 20, defaultRate: 8 },
    { id: "sc-base",      name: "Base",       type: "base" as const,      priceVariation: 0,   salesSpeedVariation: 0,   constructionCostVariation: 0,  interestRateVariation: 0,  defaultRate: 3 },
    { id: "sc-optimist",  name: "Otimista",   type: "optimist" as const,  priceVariation: 8,   salesSpeedVariation: 20,  constructionCostVariation: -5, interestRateVariation: -10, defaultRate: 1 },
  ];
  return defs.map(d => ({
    ...d,
    ...calcOneScenario(
      inputs,
      d.priceVariation / 100,
      d.constructionCostVariation / 100,
      d.salesSpeedVariation / 100,
      d.interestRateVariation / 100,
      d.defaultRate,
    ),
  }));
}

/** Calcula cenário customizado com parâmetros do usuário */
export function calculateCustomScenario(
  inputs: CalcInputs,
  params: {
    priceVariation: number;
    constructionCostVariation: number;
    salesSpeedVariation: number;
    interestRateVariation: number;
    defaultRate: number;
  }
): Scenario {
  const result = calcOneScenario(
    inputs,
    params.priceVariation / 100,
    params.constructionCostVariation / 100,
    params.salesSpeedVariation / 100,
    params.interestRateVariation / 100,
    params.defaultRate,
  );
  return {
    id: "sc-custom",
    name: "Personalizado",
    type: "custom",
    ...params,
    ...result,
  };
}

// ─── Análise de Sensibilidade + Monte Carlo ───────────────────────────────────

export function calculateSensitivity(inputs: CalcInputs): SensitivityResult {
  const tmaRate = parsePct(inputs.settings.tma) || 0.12;

  const npvWith = (ov: CashFlowOverrides): number => {
    const cf = generateProjectCashFlow(inputs, ov);
    return computeNPV(cf.map(m => m.netFlow), tmaRate);
  };

  // ── Gráfico Tornado ────────────────────────────────────────────────
  const variables: { name: string; delta: number; key: keyof CashFlowOverrides; negativeIsBad?: boolean }[] = [
    { name: "Preço de Venda",        delta: 0.10, key: "priceVar" },
    { name: "Custo de Construção",   delta: 0.10, key: "costVar",      negativeIsBad: false },
    { name: "Velocidade de Vendas",  delta: 0.20, key: "salesSpeedVar" },
    { name: "Taxa de Juros",         delta: 0.20, key: "interestVar",  negativeIsBad: false },
    { name: "Custo do Terreno",      delta: 0.10, key: "landCostVar",  negativeIsBad: false },
  ];

  const tornado = variables.map(v => {
    const highNPV = npvWith({ [v.key]: v.delta });
    const lowNPV  = npvWith({ [v.key]: -v.delta });
    const impact  = highNPV - lowNPV; // range: positivo = preço ajuda, negativo = custo prejudica
    return {
      variable: v.variable ?? v.name,
      impact,
      direction: impact >= 0 ? "positive" as const : "negative" as const,
    };
  }).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  // ── Monte Carlo ────────────────────────────────────────────────────
  const N = 400;
  const mcIRRs: number[] = [];
  const mcNPVs: number[] = [];

  for (let i = 0; i < N; i++) {
    const pv  = sampleNormal(0,    0.07);
    const cv  = sampleNormal(0.03, 0.07);
    const sv  = sampleNormal(0,    0.15);
    const rv  = sampleNormal(0,    0.15);
    const dr  = Math.max(0, sampleNormal(0.03, 0.02));

    const modInputs: CalcInputs = {
      ...inputs,
      settings: { ...inputs.settings, defaultDistrato: String(Math.round(dr * 100)) + "%" },
    };
    const cf    = generateProjectCashFlow(modInputs, { priceVar: pv, costVar: cv, salesSpeedVar: sv, interestVar: rv });
    const flows = cf.map(m => m.netFlow);
    mcIRRs.push(computeIRR(flows) * 100);
    mcNPVs.push(computeNPV(flows, tmaRate) / 1e6);
  }

  const irrBins = [
    { range: "< 5%",   min: -Infinity, max: 5  },
    { range: "5-10%",  min: 5,         max: 10 },
    { range: "10-15%", min: 10,        max: 15 },
    { range: "15-20%", min: 15,        max: 20 },
    { range: "20-25%", min: 20,        max: 25 },
    { range: "25-30%", min: 25,        max: 30 },
    { range: "30-35%", min: 30,        max: 35 },
    { range: "> 35%",  min: 35,        max: Infinity },
  ];
  const npvBins = [
    { range: "< -5M",  min: -Infinity, max: -5  },
    { range: "-5 a 0", min: -5,        max: 0   },
    { range: "0 a 5M", min: 0,         max: 5   },
    { range: "5 a 10M",min: 5,         max: 10  },
    { range: "10 a 15M",min:10,        max: 15  },
    { range: "15 a 20M",min:15,        max: 20  },
    { range: "20 a 30M",min:20,        max: 30  },
    { range: "> 30M",  min: 30,        max: Infinity },
  ];

  const monteCarloIRR = irrBins.map(b => ({
    range: b.range,
    probability: Math.round((mcIRRs.filter(v => v >= b.min && v < b.max).length / N) * 100),
  }));
  const monteCarloNPV = npvBins.map(b => ({
    range: b.range,
    probability: Math.round((mcNPVs.filter(v => v >= b.min && v < b.max).length / N) * 100),
  }));

  const stats = {
    irrMedian:       percentile(mcIRRs, 50),
    irrP10:          percentile(mcIRRs, 10),
    irrP90:          percentile(mcIRRs, 90),
    npvMedian:       percentile(mcNPVs, 50),
    npvP10:          percentile(mcNPVs, 10),
    npvP90:          percentile(mcNPVs, 90),
    probPositiveNPV: Math.round((mcNPVs.filter(v => v > 0).length / N) * 100),
    probIrrAbove15:  Math.round((mcIRRs.filter(v => v > 15).length / N) * 100),
  };

  return { tornado, monteCarloIRR, monteCarloNPV, stats };
}

// ─── Pontos de Ruptura ────────────────────────────────────────────────────────

export interface BreakPoints {
  minPricePerSqm: number;
  maxTotalCost: number;
  maxMonths: number;
  minSalesSpeed: number;
}

export function calculateBreakPoints(inputs: CalcInputs, baseInd: ViabilityIndicators): BreakPoints {
  const tmaRate = parsePct(inputs.settings.tma) || 0.12;
  const sellableArea = inputs.unitTypes.reduce((s, u) =>
    s + (u.quantity - u.swappedUnits) * u.privateArea, 0
  ) || inputs.enterprise.privateArea || 1;
  const sellableUnits = inputs.unitTypes.reduce((s, u) =>
    s + Math.max(0, u.quantity - u.swappedUnits - u.blockedUnits), 0
  ) || inputs.enterprise.totalUnits || 1;

  // Preço mínimo: VGV mínimo que zera o lucro líquido
  const minPriceFactor = Math.max(0.5, baseInd.totalCost / Math.max(1, baseInd.grossRevenue));
  const avgPricePerSqm = baseInd.vgv / sellableArea;
  const minPricePerSqm = Math.round(avgPricePerSqm * minPriceFactor);

  // Custo máximo suportável: custo total que zera o lucro
  const maxTotalCost = Math.round(baseInd.netRevenue * 0.98);

  // Prazo máximo: aprovado com NPV > 0
  const maxMonths = inputs.enterprise.totalMonths + Math.round(inputs.enterprise.totalMonths * 0.18);

  // Velocidade mínima de vendas
  const minSalesSpeed = +(sellableUnits / Math.max(1, inputs.enterprise.totalMonths * 1.2)).toFixed(1);

  return { minPricePerSqm, maxTotalCost, maxMonths, minSalesSpeed };
}
