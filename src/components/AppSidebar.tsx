import {
  Building2,
  LayoutDashboard,
  Home,
  DoorOpen,
  Users,
  CreditCard,
  Wrench,
  Megaphone,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Properties", url: "/properties", icon: Home },
  { title: "Tenants", url: "/tenants", icon: Users },
  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "Maintenance", url: "/maintenance", icon: Wrench },
  { title: "Announcements", url: "/announcements", icon: Megaphone },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar className="border-r-0">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-display text-base font-bold text-sidebar-foreground">RentWise</span>
      </div>

      <SidebarContent className="px-2 pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/50">
            Manage
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-1">
        <RoleSwitcher />
        <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
