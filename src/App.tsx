import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { ThemeProvider } from "@/hooks/use-theme";
import Dashboard from "./pages/Dashboard";
import EmpreendimentoPage from "./pages/EmpreendimentoPage";
import TerrenoPage from "./pages/TerrenoPage";
import ProdutoPage from "./pages/ProdutoPage";
import CustosPage from "./pages/CustosPage";
import DespesasPage from "./pages/DespesasPage";
import ReceitasPage from "./pages/ReceitasPage";
import CronogramaPage from "./pages/CronogramaPage";
import FundingPage from "./pages/FundingPage";
import TributosPage from "./pages/TributosPage";
import FluxoCaixaPage from "./pages/FluxoCaixaPage";
import IndicadoresPage from "./pages/IndicadoresPage";
import CenariosPage from "./pages/CenariosPage";
import SensibilidadePage from "./pages/SensibilidadePage";
import RelatoriosPage from "./pages/RelatoriosPage";
import ComparadorPage from "./pages/ComparadorPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import AuditoriaPage from "./pages/AuditoriaPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <ProjectProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/empreendimento" element={<EmpreendimentoPage />} />
                <Route path="/terreno" element={<TerrenoPage />} />
                <Route path="/produto" element={<ProdutoPage />} />
                <Route path="/custos" element={<CustosPage />} />
                <Route path="/despesas" element={<DespesasPage />} />
                <Route path="/receitas" element={<ReceitasPage />} />
                <Route path="/cronograma" element={<CronogramaPage />} />
                <Route path="/funding" element={<FundingPage />} />
                <Route path="/tributos" element={<TributosPage />} />
                <Route path="/fluxo-caixa" element={<FluxoCaixaPage />} />
                <Route path="/indicadores" element={<IndicadoresPage />} />
                <Route path="/cenarios" element={<CenariosPage />} />
                <Route path="/sensibilidade" element={<SensibilidadePage />} />
                <Route path="/relatorios" element={<RelatoriosPage />} />
                <Route path="/comparador" element={<ComparadorPage />} />
                <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                <Route path="/auditoria" element={<AuditoriaPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </TooltipProvider>
      </ProjectProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
