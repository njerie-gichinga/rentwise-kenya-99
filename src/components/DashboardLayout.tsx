import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import NotificationBell from "@/components/NotificationBell";
import InstallBanner from "@/components/InstallBanner";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <Link to="/dashboard" className="flex items-center gap-2 md:hidden">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                  <Building2 className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="font-display text-sm font-bold text-foreground">RentWise</span>
              </Link>
            </div>
            <NotificationBell />
          </header>
          <InstallBanner />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
