import { Building2, CreditCard, Home, Wrench, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/StatsCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const TenantPortal = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch assigned unit
  const { data: unit, isLoading } = useQuery({
    queryKey: ["tenant-unit", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*, properties!inner(name, address)")
        .eq("tenant_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch payment history
  const { data: payments = [] } = useQuery({
    queryKey: ["tenant-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", user!.id)
        .order("payment_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const handlePayRent = () => {
    toast({ title: "Coming soon", description: "M-Pesa payment integration is being set up." });
  };

  const lastPayment = payments[0];
  const rentDue = unit ? `KES ${unit.rent_amount.toLocaleString()}` : "—";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">RentWise</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </header>

      {/* Install banner */}
      <div className="border-b bg-primary/5 px-4 py-2.5 text-center text-sm text-primary">
        📱 <strong>Add to Home Screen</strong> for quick access — tap <em>Share → Add to Home Screen</em>
      </div>

      <div className="container max-w-2xl space-y-6 py-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your unit…</p>
        ) : !unit ? (
          <div className="rounded-xl border bg-card p-8 text-center shadow-card">
            <Home className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No unit assigned yet. Your landlord will assign you to a unit shortly.</p>
          </div>
        ) : (
          <>
            {/* Unit info */}
            <div className="rounded-xl border bg-card p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="font-display text-lg font-bold text-card-foreground">Unit {unit.unit_number}</h1>
                  <p className="text-sm text-muted-foreground">{(unit.properties as any)?.name} · {(unit.properties as any)?.address}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-3 grid-cols-2">
              <StatsCard title="Rent Due" value={rentDue} subtitle="Monthly" icon={CreditCard} />
              <StatsCard
                title="Status"
                value={lastPayment ? "Paid" : "No payments"}
                subtitle={lastPayment ? `Last: ${new Date(lastPayment.payment_date).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}` : ""}
                icon={CreditCard}
              />
            </div>

            {/* Quick Actions */}
            <div className="grid gap-3 grid-cols-2">
              <Button className="h-auto flex-col gap-1.5 py-4" size="lg" onClick={handlePayRent}>
                <CreditCard className="h-5 w-5" />
                <span className="text-sm font-medium">Pay Rent</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-1.5 py-4" size="lg">
                <Wrench className="h-5 w-5" />
                <span className="text-sm font-medium">Request Repair</span>
              </Button>
            </div>

            {/* Payment history */}
            <div className="rounded-xl border bg-card shadow-card">
              <div className="border-b px-4 py-3">
                <h2 className="font-display text-sm font-semibold text-card-foreground">Payment History</h2>
              </div>
              {payments.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">No payments yet.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-card-foreground">
                          {new Date(p.payment_date).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Paid {new Date(p.payment_date).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                          {p.mpesa_ref ? ` via M-Pesa` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-card-foreground">KES {p.amount.toLocaleString()}</p>
                        <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TenantPortal;
