import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import StatsCard from "@/components/StatsCard";
import { Building2, Users, CreditCard, AlertTriangle, Plus, UserPlus, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { user } = useAuth();

  // Fetch properties
  const { data: properties = [] } = useQuery({
    queryKey: ["dashboard-properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id, total_units");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch units
  const { data: units = [] } = useQuery({
    queryKey: ["dashboard-units", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("id, status, tenant_id, rent_amount, property_id");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch this month's payments
  const { data: payments = [] } = useQuery({
    queryKey: ["dashboard-payments", user?.id],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, status, payment_date, tenant_id, mpesa_ref, units!inner(unit_number, tenant_id)")
        .gte("payment_date", startOfMonth)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch tenant profiles for recent payments
  const paymentTenantIds = payments.filter((p) => p.tenant_id).map((p) => p.tenant_id!);
  const { data: paymentProfiles = [] } = useQuery({
    queryKey: ["dashboard-payment-profiles", paymentTenantIds],
    queryFn: async () => {
      if (paymentTenantIds.length === 0) return [];
      const { data, error } = await supabase.from("profiles").select("user_id, full_name").in("user_id", paymentTenantIds);
      if (error) throw error;
      return data;
    },
    enabled: paymentTenantIds.length > 0,
  });

  const totalUnits = units.length;
  const occupiedUnits = units.filter((u) => u.status === "occupied").length;
  const vacantUnits = totalUnits - occupiedUnits;

  const collected = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Overdue: occupied units whose rent hasn't been paid this month
  const paidUnitIds = new Set(payments.filter((p) => p.status === "completed").map((p) => p.id));
  const occupiedUnitsList = units.filter((u) => u.status === "occupied");
  const paidTenantIds = new Set(payments.filter((p) => p.status === "completed").map((p) => p.tenant_id));
  const overdueUnits = occupiedUnitsList.filter((u) => !paidTenantIds.has(u.tenant_id));
  const overdueAmount = overdueUnits.reduce((sum, u) => sum + Number(u.rent_amount), 0);

  const stats = [
    { title: "Properties", value: String(properties.length), subtitle: `${totalUnits} total units`, icon: Building2 },
    { title: "Tenants", value: String(occupiedUnits), subtitle: `${vacantUnits} vacant units`, icon: Users },
    { title: "Collected", value: `KES ${collected.toLocaleString()}`, subtitle: "This month", icon: CreditCard },
    { title: "Overdue", value: `KES ${overdueAmount.toLocaleString()}`, subtitle: `${overdueUnits.length} tenants`, icon: AlertTriangle },
  ];

  const recentPayments = payments.slice(0, 5).map((p) => {
    const profile = paymentProfiles.find((pr) => pr.user_id === p.tenant_id);
    return {
      tenant: profile?.full_name || "Unknown",
      unit: (p.units as any)?.unit_number || "",
      amount: `KES ${Number(p.amount).toLocaleString()}`,
      date: new Date(p.payment_date).toLocaleDateString("en-KE", { month: "short", day: "numeric" }),
      method: p.mpesa_ref ? "M-Pesa" : "Cash",
      status: p.status,
    };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back. Here's your rental overview.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/properties">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Property
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/tenants">
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Invite Tenant
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatsCard key={s.title} {...s} />
          ))}
        </div>

        {/* Recent Payments */}
        <div className="rounded-xl border bg-card shadow-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-card-foreground">Recent Payments</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/payments" className="text-xs">View all</Link>
            </Button>
          </div>
          {recentPayments.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No payments this month yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentPayments.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-card-foreground truncate">{p.tenant}</p>
                    <p className="text-xs text-muted-foreground">
                      Unit {p.unit} · {p.method} · {p.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-card-foreground">{p.amount}</p>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        p.status === "completed"
                          ? "bg-primary/10 text-primary"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
