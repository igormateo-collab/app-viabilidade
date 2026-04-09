import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import {
  Enterprise,
  UnitType,
  CostCategory,
  MonthlyCashFlow,
  Scenario,
  ViabilityIndicators,
  enterprise as defaultEnterprise,
  unitTypes as defaultUnitTypes,
  costCategories as defaultCostCategories,
  landAcquisition as defaultLand,
  taxConfig as defaultTax,
  indirectExpenses as defaultExpenses,
  financing as defaultFinancing,
} from "@/data/mockData";
import {
  generateProjectCashFlow,
  calculateIndicators,
  calculateScenarios,
  CalcInputs,
  SensitivityResult,
} from "@/lib/calculator";

export interface SettingsData {
  incc: string; ipca: string; cdi: string; selic: string;
  tma: string; discountRate: string; currency: string; rounding: string;
  defaultDistrato: string; defaultInadimplencia: string; salesCommission: string;
  priceAdjustIndex: string; minMargin: string; minIrr: string;
  maxExposure: string; maxPayback: string;
}

const defaultSettings: SettingsData = {
  incc: "7,50%", ipca: "4,25%", cdi: "13,75%", selic: "13,75%",
  tma: "12,00% a.a.", discountRate: "12,00% a.a.", currency: "BRL (R$)",
  rounding: "Sem casas decimais", defaultDistrato: "3%",
  defaultInadimplencia: "2%", salesCommission: "6,50%",
  priceAdjustIndex: "INCC", minMargin: "12%", minIrr: "12% a.a.",
  maxExposure: "R$ 50.000.000", maxPayback: "36 meses",
};

interface ProjectContextType {
  enterprise: Enterprise; updateEnterprise: (u: Partial<Enterprise>) => void;
  unitTypes: UnitType[]; setUnitTypes: React.Dispatch<React.SetStateAction<UnitType[]>>;
  addUnitType: (u: UnitType) => void; removeUnitType: (id: string) => void;
  updateUnitType: (id: string, u: Partial<UnitType>) => void;
  costCategories: CostCategory[]; setCostCategories: React.Dispatch<React.SetStateAction<CostCategory[]>>;
  addCostCategory: (c: CostCategory) => void; removeCostCategory: (id: string) => void;
  updateCostCategory: (id: string, u: Partial<CostCategory>) => void;
  land: typeof defaultLand; updateLand: (u: Partial<typeof defaultLand>) => void;
  tax: typeof defaultTax; updateTax: (u: Partial<typeof defaultTax>) => void;
  expenses: typeof defaultExpenses; updateExpenses: (e: typeof defaultExpenses) => void;
  fund: typeof defaultFinancing; updateFund: (u: Partial<typeof defaultFinancing>) => void;
  settings: SettingsData; updateSettings: (u: Partial<SettingsData>) => void;
  resetAll: () => void;
  // Computed
  indicators: ViabilityIndicators;
  cashFlowData: MonthlyCashFlow[];
  scenarios: Scenario[];
  sensitivity: SensitivityResult | null;
  runSensitivity: () => void;
  sensitivityLoading: boolean;
  calcInputs: CalcInputs;
}

const ProjectContext = createContext<ProjectContextType | null>(null);
const STORAGE_KEY = "propalytics-v2";

function loadSaved() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const s = loadSaved();
  const [enterprise, setEnterprise] = useState<Enterprise>(s?.enterprise ?? { ...defaultEnterprise });
  const [unitTypes, setUnitTypes] = useState<UnitType[]>(s?.unitTypes ?? defaultUnitTypes.map(u => ({ ...u })));
  const [costCategories, setCostCategories] = useState<CostCategory[]>(s?.costCategories ?? defaultCostCategories.map(c => ({ ...c })));
  const [land, setLand] = useState(s?.land ?? { ...defaultLand });
  const [tax, setTax] = useState(s?.tax ?? { ...defaultTax });
  const [expenses, setExpenses] = useState(s?.expenses ?? [...defaultExpenses]);
  const [fund, setFund] = useState(s?.fund ?? { ...defaultFinancing });
  const [settings, setSettings] = useState<SettingsData>(s?.settings ?? { ...defaultSettings });
  const [sensitivity, setSensitivity] = useState<SensitivityResult | null>(null);
  const [sensitivityLoading, setSensitivityLoading] = useState(false);

  // Persistência com debounce
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ enterprise, unitTypes, costCategories, land, tax, expenses, fund, settings })); } catch { }
    }, 600);
    return () => clearTimeout(t);
  }, [enterprise, unitTypes, costCategories, land, tax, expenses, fund, settings]);

  // Inputs para o motor
  const calcInputs = useMemo<CalcInputs>(() => ({
    enterprise, unitTypes, costCategories, land, tax, expenses, financing: fund, settings,
  }), [enterprise, unitTypes, costCategories, land, tax, expenses, fund, settings]);

  // Fluxo de caixa reativo
  const cashFlowData = useMemo<MonthlyCashFlow[]>(() => generateProjectCashFlow(calcInputs), [calcInputs]);

  // Indicadores reativos
  const indicators = useMemo<ViabilityIndicators>(() => calculateIndicators(calcInputs, cashFlowData), [calcInputs, cashFlowData]);

  // Cenários reativos
  const scenarios = useMemo<Scenario[]>(() => calculateScenarios(calcInputs), [calcInputs]);

  // Sensibilidade sob demanda
  const runSensitivity = useCallback(() => {
    setSensitivityLoading(true);
    setSensitivity(null);
    setTimeout(() => {
      import("@/lib/calculator").then(({ calculateSensitivity }) => {
        setSensitivity(calculateSensitivity(calcInputs));
        setSensitivityLoading(false);
      });
    }, 30);
  }, [calcInputs]);

  // Mutations
  const updateEnterprise = useCallback((u: Partial<Enterprise>) => setEnterprise(p => ({ ...p, ...u })), []);
  const addUnitType = useCallback((u: UnitType) => setUnitTypes(p => [...p, u]), []);
  const removeUnitType = useCallback((id: string) => setUnitTypes(p => p.filter(u => u.id !== id)), []);
  const updateUnitType = useCallback((id: string, u: Partial<UnitType>) => setUnitTypes(p => p.map(x => x.id === id ? { ...x, ...u } : x)), []);
  const addCostCategory = useCallback((c: CostCategory) => setCostCategories(p => [...p, c]), []);
  const removeCostCategory = useCallback((id: string) => setCostCategories(p => p.filter(c => c.id !== id)), []);
  const updateCostCategory = useCallback((id: string, u: Partial<CostCategory>) => setCostCategories(p => p.map(c => c.id === id ? { ...c, ...u } : c)), []);
  const updateLand = useCallback((u: Partial<typeof defaultLand>) => setLand(p => ({ ...p, ...u })), []);
  const updateTax = useCallback((u: Partial<typeof defaultTax>) => setTax(p => ({ ...p, ...u })), []);
  const updateExpenses = useCallback((e: typeof defaultExpenses) => setExpenses(e), []);
  const updateFund = useCallback((u: Partial<typeof defaultFinancing>) => setFund(p => ({ ...p, ...u })), []);
  const updateSettings = useCallback((u: Partial<SettingsData>) => setSettings(p => ({ ...p, ...u })), []);
  const resetAll = useCallback(() => {
    setEnterprise({ ...defaultEnterprise }); setUnitTypes(defaultUnitTypes.map(u => ({ ...u })));
    setCostCategories(defaultCostCategories.map(c => ({ ...c }))); setLand({ ...defaultLand });
    setTax({ ...defaultTax }); setExpenses([...defaultExpenses]); setFund({ ...defaultFinancing });
    setSettings({ ...defaultSettings }); setSensitivity(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ProjectContext.Provider value={{
      enterprise, updateEnterprise, unitTypes, setUnitTypes, addUnitType, removeUnitType, updateUnitType,
      costCategories, setCostCategories, addCostCategory, removeCostCategory, updateCostCategory,
      land, updateLand, tax, updateTax, expenses, updateExpenses, fund, updateFund,
      settings, updateSettings, resetAll,
      indicators, cashFlowData, scenarios, sensitivity, runSensitivity, sensitivityLoading, calcInputs,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
