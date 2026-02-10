import DashboardLayout from "@/components/DashboardLayout";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Payments = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  // Fetch payments for landlord's units
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, units!inner(unit_number, tenant_id, properties!inner(name))")
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch tenant profiles for display
  const tenantIds = payments.filter((p) => p.tenant_id).map((p) => p.tenant_id!);
  const { data: profiles = [] } = useQuery({
    queryKey: ["payment-profiles", tenantIds],
    queryFn: async () => {
      if (tenantIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", tenantIds);
      if (error) throw error;
      return data;
    },
    enabled: tenantIds.length > 0,
  });

  const enriched = payments.map((p) => {
    const profile = profiles.find((pr) => pr.user_id === p.tenant_id);
    return {
      ...p,
      tenant_name: profile?.full_name || "Unknown",
      unit_number: (p.units as any)?.unit_number || "",
      method: p.mpesa_ref ? "M-Pesa" : "Cash",
    };
  });

  const filtered = enriched.filter(
    (p) =>
      p.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.mpesa_ref || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-sm text-muted-foreground">Track M-Pesa and cash payments</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by tenant or reference…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading payments…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center shadow-card">
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card shadow-card overflow-hidden">
            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Tenant</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Unit</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Method</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Ref</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-card-foreground">{p.tenant_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.unit_number}</td>
                      <td className="px-4 py-3 font-semibold text-card-foreground">KES {p.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.method}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.mpesa_ref || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${p.status === "completed" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y sm:hidden">
              {filtered.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{p.tenant_name}</p>
                    <p className="text-xs text-muted-foreground">Unit {p.unit_number} · {p.method} · {p.payment_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-card-foreground">KES {p.amount.toLocaleString()}</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${p.status === "completed" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Payments;
