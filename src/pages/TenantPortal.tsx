import { useState, useEffect, useRef } from "react";
import { Building2, CreditCard, Home, Wrench, LogOut, ArrowLeftRight, PartyPopper, Plus, Clock, CheckCircle2, AlertTriangle, ImagePlus, X, HelpCircle } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import InstallBanner from "@/components/InstallBanner";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatsCard from "@/components/StatsCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const TenantPortal = () => {
  const { user, roles, switchRole, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [welcomeData, setWelcomeData] = useState<{ unit_number: string; property_name: string; rent_amount: number } | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [reqTitle, setReqTitle] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [reqPriority, setReqPriority] = useState("medium");
  const [reqImage, setReqImage] = useState<File | null>(null);
  const [reqImagePreview, setReqImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payPhone, setPayPhone] = useState("");
  const [payingRent, setPayingRent] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("rentwise_welcome");
    if (stored) {
      setWelcomeData(JSON.parse(stored));
      localStorage.removeItem("rentwise_welcome");
    }
  }, []);

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

  // Fetch maintenance requests
  const { data: maintenanceRequests = [] } = useQuery({
    queryKey: ["tenant-maintenance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*")
        .eq("tenant_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB allowed.", variant: "destructive" });
      return;
    }
    setReqImage(file);
    setReqImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setReqImage(null);
    setReqImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      let imageUrl: string | null = null;

      if (reqImage) {
        const ext = reqImage.name.split(".").pop();
        const path = `${user!.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("maintenance-images")
          .upload(path, reqImage);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("maintenance-images")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("maintenance_requests").insert({
        unit_id: unit!.id,
        tenant_id: user!.id,
        title: reqTitle.trim(),
        description: reqDesc.trim() || null,
        priority: reqPriority,
        image_url: imageUrl,
      });
      if (error) throw error;

      // Notify landlord via email (fire-and-forget)
      supabase.functions.invoke("notify-maintenance", {
        body: {
          unit_id: unit!.id,
          title: reqTitle.trim(),
          description: reqDesc.trim() || null,
          priority: reqPriority,
          tenant_name: user!.user_metadata?.full_name || user!.email,
        },
      }).catch((err) => console.error("Notification failed:", err));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-maintenance"] });
      setRequestOpen(false);
      setReqTitle("");
      setReqDesc("");
      setReqPriority("medium");
      clearImage();
      toast({ title: "Request submitted", description: "Your landlord will be notified." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const handlePayRent = async () => {
    if (!payPhone.trim() || !unit) return;
    setPayingRent(true);
    try {
      const { data, error } = await supabase.functions.invoke("mpesa-stk-push", {
        body: {
          phone: payPhone.trim(),
          amount: unit.rent_amount,
          unit_id: unit.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Check your phone", description: "Enter your M-Pesa PIN to complete payment." });
      setPayDialogOpen(false);
      setPayPhone("");
      // Refresh payments after a delay to pick up the pending record
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["tenant-payments"] }), 3000);
    } catch (e: any) {
      toast({ title: "Payment failed", description: e.message, variant: "destructive" });
    } finally {
      setPayingRent(false);
    }
  };

  const lastPayment = payments[0];
  const rentDue = unit ? `KES ${unit.rent_amount.toLocaleString()}` : "—";

  const statusIcon = (s: string) => {
    if (s === "completed") return <CheckCircle2 className="h-4 w-4 text-primary" />;
    if (s === "in_progress") return <Clock className="h-4 w-4 text-amber-500" />;
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">RentEase</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {roles.includes("landlord") && (
              <Button variant="outline" size="sm" onClick={() => { switchRole("landlord"); navigate("/dashboard", { replace: true }); }}>
                <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" />
                Landlord View
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <InstallBanner />

      <div className="container max-w-2xl space-y-6 py-6">
        {/* Welcome banner */}
        {welcomeData && (
          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-card-foreground">Welcome! You have been assigned to Unit {welcomeData.unit_number} at {welcomeData.property_name}.</p>
              <p className="text-sm text-muted-foreground">Rent due: KSh {welcomeData.rent_amount.toLocaleString()}</p>
            </div>
          </div>
        )}
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
              <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="h-auto flex-col gap-1.5 py-4" size="lg">
                    <CreditCard className="h-5 w-5" />
                    <span className="text-sm font-medium">Pay Rent</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Pay Rent via M-Pesa</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="text-2xl font-bold text-foreground">KES {unit?.rent_amount.toLocaleString()}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pay-phone">M-Pesa Phone Number</Label>
                      <Input
                        id="pay-phone"
                        type="tel"
                        placeholder="0712345678"
                        value={payPhone}
                        onChange={(e) => setPayPhone(e.target.value)}
                        maxLength={13}
                      />
                      <p className="text-xs text-muted-foreground">You'll receive an STK push prompt on this number</p>
                    </div>
                    <Button
                      className="w-full"
                      disabled={!payPhone.trim() || payingRent}
                      onClick={handlePayRent}
                    >
                      {payingRent ? "Sending prompt…" : "Pay Now"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-auto flex-col gap-1.5 py-4" size="lg" disabled={!unit}>
                    <Wrench className="h-5 w-5" />
                    <span className="text-sm font-medium">Request Repair</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Submit Repair Request</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="req-title">What needs fixing?</Label>
                      <Input id="req-title" placeholder="e.g. Leaking kitchen tap" value={reqTitle} onChange={(e) => setReqTitle(e.target.value)} maxLength={200} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="req-desc">Details (optional)</Label>
                      <Textarea id="req-desc" placeholder="Describe the issue…" value={reqDesc} onChange={(e) => setReqDesc(e.target.value)} maxLength={1000} />
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={reqPriority} onValueChange={setReqPriority}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Image upload */}
                    <div className="space-y-2">
                      <Label>Photo (optional)</Label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                      {reqImagePreview ? (
                        <div className="relative w-full">
                          <img src={reqImagePreview} alt="Preview" className="w-full rounded-lg border object-cover max-h-48" />
                          <button type="button" onClick={clearImage} className="absolute top-1.5 right-1.5 rounded-full bg-background/80 p-1 hover:bg-background">
                            <X className="h-4 w-4 text-foreground" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 py-6 text-sm text-muted-foreground hover:border-muted-foreground/50 transition-colors"
                        >
                          <ImagePlus className="h-5 w-5" />
                          Add a photo
                        </button>
                      )}
                    </div>
                    <Button className="w-full" disabled={!reqTitle.trim() || createRequestMutation.isPending} onClick={() => createRequestMutation.mutate()}>
                      {createRequestMutation.isPending ? "Submitting…" : "Submit Request"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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

            {/* Maintenance requests */}
            <div className="rounded-xl border bg-card shadow-card">
              <div className="border-b px-4 py-3">
                <h2 className="font-display text-sm font-semibold text-card-foreground">Repair Requests</h2>
              </div>
              {maintenanceRequests.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">No repair requests yet.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {maintenanceRequests.map((r) => (
                    <div key={r.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="mt-0.5">{statusIcon(r.status)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-card-foreground">{r.title}</p>
                        {r.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{r.description}</p>}
                        {r.image_url && (
                          <img src={r.image_url} alt="Issue photo" className="mt-2 rounded-lg border max-h-32 object-cover" />
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(r.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric" })} · {r.priority} priority
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                        {r.status.replace("_", " ")}
                      </span>
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
