import { useIsMobile } from "@/hooks/use-mobile";
import { NavLink } from "@/components/NavLink";
import { useSidebar } from "@/components/ui/sidebar";
import { LayoutDashboard, Building2, DollarSign, BarChart3, Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Cadastro", url: "/empreendimento", icon: Building2 },
  { title: "Fluxo", url: "/fluxo-caixa", icon: DollarSign },
  { title: "Análise", url: "/indicadores", icon: BarChart3 },
];

export function MobileBottomNav() {
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();
  const location = useLocation();

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border md:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16 px-1">
        {bottomNavItems.map((item) => {
          const isActive =
            item.url === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.url);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors min-w-[56px] text-sidebar-foreground"
              )}
              activeClassName="text-primary"
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-sidebar-foreground")} />
              <span className={cn("text-[10px] font-body font-medium leading-none", isActive ? "text-primary" : "text-sidebar-foreground/70")}>
                {item.title}
              </span>
            </NavLink>
          );
        })}

        {/* Menu button opens full sidebar drawer */}
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors min-w-[56px] text-sidebar-foreground"
        >
          <Menu className="h-5 w-5 text-sidebar-foreground" />
          <span className="text-[10px] font-body font-medium leading-none text-sidebar-foreground/70">Menu</span>
        </button>
      </div>
    </nav>
  );
}
