import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Search, Phone, Home, Pencil, Trash2, RotateCw, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Tenants = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<{ unitId: string; tenantId: string; name: string; phone: string } | null>(null);
  const [removeTenant, setRemoveTenant] = useState<{ unitId: string; name: string } | null>(null);
  const [recallInvitation, setRecallInvitation] = useState<{ id: string; name: string } | null>(null);

  // Fetch vacant units belonging to current landlord
  const { data: vacantUnits = [] } = useQuery({
    queryKey: ["vacant-units", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, rent_amount, properties!inner(name)")
        .eq("status", "vacant");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch occupied units (tenants) with profile info
  const { data: occupiedUnits = [] } = useQuery({
    queryKey: ["occupied-units", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, rent_amount, status, tenant_id, properties!inner(name)")
        .eq("status", "occupied");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch profiles for occupied tenants
  const tenantIds = occupiedUnits.filter((u) => u.tenant_id).map((u) => u.tenant_id!);
  const { data: tenantProfiles = [] } = useQuery({
    queryKey: ["tenant-profiles", tenantIds],
    queryFn: async () => {
      if (tenantIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", tenantIds);
      if (error) throw error;
      return data;
    },
    enabled: tenantIds.length > 0,
  });

  // Fetch pending invitations
  const { data: invitations = [] } = useQuery({
    queryKey: ["invitations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_invitations")
        .select("*, units!inner(unit_number, properties!inner(name))")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Build tenant list from occupied units + profiles
  const tenants = occupiedUnits.map((u) => {
    const profile = tenantProfiles.find((p) => p.user_id === u.tenant_id);
    return {
      id: u.id,
      tenantId: u.tenant_id || "",
      name: profile?.full_name || "Unknown",
      phone: profile?.phone || "",
      unit: u.unit_number,
      property: (u.properties as any)?.name || "",
      rent: `KES ${u.rent_amount.toLocaleString()}`,
      status: "active" as const,
    };
  });

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.unit.toLowerCase().includes(search.toLowerCase())
  );

  // Edit tenant mutation
  const editMutation = useMutation({
    mutationFn: async (form: { tenantId: string; name: string; phone: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: form.name, phone: form.phone })
        .eq("user_id", form.tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-profiles"] });
      toast({ title: "Tenant updated" });
      setEditTenant(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Remove tenant from unit mutation
  const removeMutation = useMutation({
    mutationFn: async (unitId: string) => {
      const { error } = await supabase
        .from("units")
        .update({ tenant_id: null, status: "vacant" })
        .eq("id", unitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["occupied-units"] });
      queryClient.invalidateQueries({ queryKey: ["vacant-units"] });
      toast({ title: "Tenant removed from unit" });
      setRemoveTenant(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Resend invitation mutation
  const resendMutation = useMutation({
    mutationFn: async (inv: any) => {
      try {
        await supabase.functions.invoke("send-invitation", {
          body: {
            tenant_name: inv.tenant_name,
            tenant_email: inv.tenant_email,
            property_name: (inv.units as any)?.properties?.name || "",
            unit_number: (inv.units as any)?.unit_number || "",
            invitation_id: inv.id,
            app_url: window.location.origin,
          },
        });
      } catch (err) {
        throw new Error("Failed to resend invitation email");
      }
    },
    onSuccess: () => toast({ title: "Invitation resent!" }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Recall (cancel) invitation mutation
  const recallMutation = useMutation({
    mutationFn: async (invId: string) => {
      const { error } = await supabase
        .from("tenant_invitations")
        .update({ status: "cancelled" })
        .eq("id", invId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast({ title: "Invitation recalled" });
      setRecallInvitation(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async (form: { tenant_name: string; tenant_email: string; tenant_phone: string; unit_id: string }) => {
      const selectedUnit = vacantUnits.find((u) => u.id === form.unit_id);
      const { data, error } = await supabase.from("tenant_invitations").insert({
        landlord_id: user!.id,
        ...form,
      }).select("id").single();
      if (error) throw error;
      try {
        await supabase.functions.invoke("send-invitation", {
          body: {
            tenant_name: form.tenant_name,
            tenant_email: form.tenant_email,
            property_name: (selectedUnit?.properties as any)?.name || "",
            unit_number: selectedUnit?.unit_number || "",
            invitation_id: data.id,
            app_url: window.location.origin,
          },
        });
      } catch (emailErr) {
        console.warn("Email send failed (non-blocking):", emailErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast({ title: "Invitation sent!", description: "The tenant has been invited and will receive an email." });
      setInviteOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleInvite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    inviteMutation.mutate({
      tenant_name: fd.get("name") as string,
      tenant_email: fd.get("email") as string,
      tenant_phone: fd.get("phone") as string,
      unit_id: fd.get("unit_id") as string,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Tenants</h1>
            <p className="text-sm text-muted-foreground">Manage tenants and send invitations</p>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Invite Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Invite a Tenant</DialogTitle>
                <DialogDescription>
                  Send an invitation to set up their RentWise account and link them to a unit.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input name="name" placeholder="Tenant's name" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input name="email" type="email" placeholder="tenant@email.com" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone (M-Pesa)</Label>
                    <Input name="phone" type="tel" placeholder="0712 345 678" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Assign to unit</Label>
                  <select name="unit_id" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Select a vacant unit…</option>
                    {vacantUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {(u.properties as any)?.name} – {u.unit_number} (KES {u.rent_amount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="w-full" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? "Sending…" : "Send Invitation"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tenants…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending Invitations</h2>
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-xl border border-dashed bg-card p-3">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{inv.tenant_name}</p>
                    <p className="text-xs text-muted-foreground">{inv.tenant_email} · {(inv.units as any)?.properties?.name} – {(inv.units as any)?.unit_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      disabled={resendMutation.isPending}
                      onClick={() => resendMutation.mutate(inv)}
                    >
                      <RotateCw className="h-3 w-3" />
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                      onClick={() => setRecallInvitation({ id: inv.id, name: inv.tenant_name })}
                    >
                      <XCircle className="h-3 w-3" />
                      Recall
                    </Button>
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">pending</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tenant List */}
        {filtered.length === 0 && invitations.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center shadow-card">
            <p className="text-sm text-muted-foreground">No tenants yet. Invite your first tenant to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <div key={t.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">{t.name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Home className="h-3 w-3" />{t.unit} · {t.property}</span>
                      {t.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{t.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-card-foreground">{t.rent}</p>
                    <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {t.status}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTenant({ unitId: t.id, tenantId: t.tenantId, name: t.name, phone: t.phone })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setRemoveTenant({ unitId: t.id, name: t.name })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Tenant Dialog */}
        <Dialog open={!!editTenant} onOpenChange={(o) => !o && setEditTenant(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Edit Tenant</DialogTitle>
              <DialogDescription>Update tenant contact details.</DialogDescription>
            </DialogHeader>
            {editTenant && (
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); editMutation.mutate({ tenantId: editTenant.tenantId, name: fd.get("name") as string, phone: fd.get("phone") as string }); }} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input name="name" defaultValue={editTenant.name} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input name="phone" type="tel" defaultValue={editTenant.phone} />
                </div>
                <Button type="submit" className="w-full" disabled={editMutation.isPending}>
                  {editMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Remove Tenant Confirmation */}
        <AlertDialog open={!!removeTenant} onOpenChange={(o) => !o && setRemoveTenant(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove tenant?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove <strong>{removeTenant?.name}</strong> from their unit and mark it as vacant. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => removeTenant && removeMutation.mutate(removeTenant.unitId)}>
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Tenants;
