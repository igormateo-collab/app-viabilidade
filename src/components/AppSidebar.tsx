import {
  LayoutDashboard, Building2, MapPin, Home, Hammer, Receipt,
  TrendingUp, CalendarDays, Landmark, Calculator, BarChart3,
  Layers, Shield, FileText, GitCompare, Settings, ClipboardCheck,
  DollarSign
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const modules = [
  { section: "Visão Geral", items: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
  ]},
  { section: "Cadastro", items: [
    { title: "Empreendimento", url: "/empreendimento", icon: Building2 },
    { title: "Terreno", url: "/terreno", icon: MapPin },
    { title: "Produto", url: "/produto", icon: Home },
  ]},
  { section: "Financeiro", items: [
    { title: "Custos", url: "/custos", icon: Hammer },
    { title: "Despesas", url: "/despesas", icon: Receipt },
    { title: "Receitas", url: "/receitas", icon: TrendingUp },
    { title: "Cronograma", url: "/cronograma", icon: CalendarDays },
    { title: "Funding", url: "/funding", icon: Landmark },
    { title: "Tributos", url: "/tributos", icon: Calculator },
  ]},
  { section: "Análise", items: [
    { title: "Fluxo de Caixa", url: "/fluxo-caixa", icon: DollarSign },
    { title: "Indicadores", url: "/indicadores", icon: BarChart3 },
    { title: "Cenários", url: "/cenarios", icon: Layers },
    { title: "Sensibilidade", url: "/sensibilidade", icon: Shield },
  ]},
  { section: "Gestão", items: [
    { title: "Relatórios", url: "/relatorios", icon: FileText },
    { title: "Comparador", url: "/comparador", icon: GitCompare },
    { title: "Configurações", url: "/configuracoes", icon: Settings },
    { title: "Auditoria", url: "/auditoria", icon: ClipboardCheck },
  ]},
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {!collapsed && (
          <div className="px-4 py-5 border-b border-border">
            <h1 className="font-heading text-sm font-bold text-foreground tracking-tight">ViabilityPro</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">Análise de Viabilidade</p>
          </div>
        )}
        {modules.map((group) => (
          <SidebarGroup key={group.section}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-body">
              {group.section}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="hover:bg-accent/50 transition-colors"
                        activeClassName="bg-primary/10 text-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4 shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
