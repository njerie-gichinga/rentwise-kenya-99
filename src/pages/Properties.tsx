import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Home, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Properties = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [unitDialogProperty, setUnitDialogProperty] = useState<string | null>(null);
  const [bulkUnitProperty, setBulkUnitProperty] = useState<string | null>(null);

  // Edit / delete state
  const [editProperty, setEditProperty] = useState<any | null>(null);
  const [deletePropertyId, setDeletePropertyId] = useState<string | null>(null);
  const [editUnit, setEditUnit] = useState<any | null>(null);
  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);

  // Fetch properties
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch units
  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("*").order("unit_number");
      if (error) throw error;
      return data;
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["properties"] });
    queryClient.invalidateQueries({ queryKey: ["units"] });
  };

  // ── Property mutations ──
  const addProperty = useMutation({
    mutationFn: async (form: { name: string; address: string; property_type: string; total_units: number }) => {
      const { error } = await supabase.from("properties").insert({ landlord_id: user!.id, ...form });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Property added!" }); setAddOpen(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateProperty = useMutation({
    mutationFn: async (form: { id: string; name: string; address: string; property_type: string; total_units: number }) => {
      const { id, ...rest } = form;
      const { error } = await supabase.from("properties").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Property updated!" }); setEditProperty(null); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteProperty = useMutation({
    mutationFn: async (id: string) => {
      // Delete child units first
      const { error: uErr } = await supabase.from("units").delete().eq("property_id", id);
      if (uErr) throw uErr;
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Property deleted" }); setDeletePropertyId(null); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Unit mutations ──
  const addUnit = useMutation({
    mutationFn: async (form: { property_id: string; unit_number: string; rent_amount: number; status: string }) => {
      const { error } = await supabase.from("units").insert(form);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Unit added!" }); setUnitDialogProperty(null); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const bulkAddUnits = useMutation({
    mutationFn: async (form: { property_id: string; prefix: string; start: number; end: number; rent_amount: number; status: string }) => {
      const rows = [];
      for (let i = form.start; i <= form.end; i++) {
        rows.push({
          property_id: form.property_id,
          unit_number: `${form.prefix}${i}`,
          rent_amount: form.rent_amount,
          status: form.status,
        });
      }
      const { error } = await supabase.from("units").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      invalidateAll();
      toast({ title: `${vars.end - vars.start + 1} units created!` });
      setBulkUnitProperty(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateUnit = useMutation({
    mutationFn: async (form: { id: string; unit_number: string; rent_amount: number; status: string }) => {
      const { id, ...rest } = form;
      const { error } = await supabase.from("units").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Unit updated!" }); setEditUnit(null); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteUnit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("units").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Unit deleted" }); setDeleteUnitId(null); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Form handlers ──
  const handleAddProperty = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addProperty.mutate({
      name: fd.get("name") as string,
      address: fd.get("address") as string,
      property_type: fd.get("property_type") as string,
      total_units: parseInt(fd.get("total_units") as string) || 1,
    });
  };

  const handleEditProperty = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updateProperty.mutate({
      id: editProperty.id,
      name: fd.get("name") as string,
      address: fd.get("address") as string,
      property_type: fd.get("property_type") as string,
      total_units: parseInt(fd.get("total_units") as string) || 1,
    });
  };

  const handleBulkAddUnits = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const start = parseInt(fd.get("start") as string) || 1;
    const end = parseInt(fd.get("end") as string) || 1;
    if (end < start) {
      toast({ title: "End number must be ≥ start number", variant: "destructive" });
      return;
    }
    if (end - start + 1 > 100) {
      toast({ title: "Maximum 100 units at once", variant: "destructive" });
      return;
    }
    bulkAddUnits.mutate({
      property_id: bulkUnitProperty!,
      prefix: (fd.get("prefix") as string) || "",
      start,
      end,
      rent_amount: parseFloat(fd.get("rent_amount") as string) || 0,
      status: (fd.get("status") as string) || "vacant",
    });
  };

  const handleAddUnit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addUnit.mutate({
      property_id: unitDialogProperty!,
      unit_number: fd.get("unit_number") as string,
      rent_amount: parseFloat(fd.get("rent_amount") as string) || 0,
      status: (fd.get("status") as string) || "vacant",
    });
  };

  const handleEditUnit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updateUnit.mutate({
      id: editUnit.id,
      unit_number: fd.get("unit_number") as string,
      rent_amount: parseFloat(fd.get("rent_amount") as string) || 0,
      status: (fd.get("status") as string) || "vacant",
    });
  };

  // ── Reusable property form fields ──
  const PropertyFormFields = ({ defaults }: { defaults?: any }) => (
    <>
      <div className="space-y-1.5">
        <Label>Property Name</Label>
        <Input name="name" placeholder="e.g. Sunrise Apartments" defaultValue={defaults?.name} required />
      </div>
      <div className="space-y-1.5">
        <Label>Address</Label>
        <Input name="address" placeholder="e.g. Kilimani, Nairobi" defaultValue={defaults?.address} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <select name="property_type" defaultValue={defaults?.property_type || "apartment"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="apartment">Apartment</option>
            <option value="bedsitter">Bedsitter</option>
            <option value="stalls">Stalls</option>
            <option value="house">House</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Total Units</Label>
          <Input name="total_units" type="number" min={1} defaultValue={defaults?.total_units || 1} required />
        </div>
      </div>
    </>
  );

  const UnitFormFields = ({ defaults }: { defaults?: any }) => (
    <>
      <div className="space-y-1.5">
        <Label>Unit Number</Label>
        <Input name="unit_number" placeholder="e.g. A-101" defaultValue={defaults?.unit_number} required />
      </div>
      <div className="space-y-1.5">
        <Label>Rent Amount (KES)</Label>
        <Input name="rent_amount" type="number" min={0} placeholder="15000" defaultValue={defaults?.rent_amount} required />
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <select name="status" defaultValue={defaults?.status || "vacant"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="vacant">Vacant</option>
          <option value="occupied">Occupied</option>
        </select>
      </div>
    </>
  );

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Properties</h1>
            <p className="text-sm text-muted-foreground">Manage your rental properties and units</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Add Property</DialogTitle>
                <DialogDescription>Add a new rental property to your portfolio.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddProperty} className="space-y-4 pt-2">
                <PropertyFormFields />
                <Button type="submit" className="w-full" disabled={addProperty.isPending}>
                  {addProperty.isPending ? "Saving…" : "Add Property"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading properties…</p>
        ) : properties.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center shadow-card">
            <Home className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No properties yet. Add your first property to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => {
              const propertyUnits = units.filter((u) => u.property_id === p.id);
              const occupied = propertyUnits.filter((u) => u.status === "occupied").length;
              const total = propertyUnits.length;
              const occupancy = total > 0 ? Math.round((occupied / total) * 100) : 0;
              const isExpanded = expandedProperty === p.id;

              return (
                <div key={p.id} className="rounded-xl border bg-card shadow-card transition-shadow hover:shadow-card-hover">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Home className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditProperty(p)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit property">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeletePropertyId(p.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete property">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setExpandedProperty(isExpanded ? null : p.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <h3 className="mt-3 font-display text-base font-semibold text-card-foreground">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{p.address}</p>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">{p.property_type}</span>
                      <span className="text-muted-foreground">{occupied}/{total} occupied</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${occupancy}%` }} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-card-foreground">Units</p>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setBulkUnitProperty(p.id)}>
                            <Plus className="mr-1 h-3 w-3" /> Bulk Add
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setUnitDialogProperty(p.id)}>
                            <Plus className="mr-1 h-3 w-3" /> Add Unit
                          </Button>
                        </div>
                      </div>
                      {propertyUnits.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No units yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {propertyUnits.map((u) => (
                            <div key={u.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
                              <span className="font-medium text-card-foreground">{u.unit_number}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">KES {u.rent_amount.toLocaleString()}</span>
                                <span className={`rounded-full px-2 py-0.5 font-medium ${u.status === "occupied" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"}`}>
                                  {u.status}
                                </span>
                                <button onClick={() => setEditUnit(u)} className="rounded p-1 text-muted-foreground hover:text-foreground" title="Edit unit">
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button onClick={() => setDeleteUnitId(u.id)} className="rounded p-1 text-muted-foreground hover:text-destructive" title="Delete unit">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk Add Units Dialog */}
      <Dialog open={!!bulkUnitProperty} onOpenChange={(open) => !open && setBulkUnitProperty(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Bulk Add Units</DialogTitle>
            <DialogDescription>Generate multiple units at once with a prefix and number range.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBulkAddUnits} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Prefix</Label>
              <Input name="prefix" placeholder="e.g. A-" defaultValue="" />
              <p className="text-xs text-muted-foreground">Added before each number (e.g. A-101, A-102…)</p>
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-1.5">
                <Label>Start Number</Label>
                <Input name="start" type="number" min={1} defaultValue={101} required />
              </div>
              <div className="space-y-1.5">
                <Label>End Number</Label>
                <Input name="end" type="number" min={1} defaultValue={110} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Rent Amount (KES)</Label>
              <Input name="rent_amount" type="number" min={0} placeholder="15000" required />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select name="status" defaultValue="vacant" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={bulkAddUnits.isPending}>
              {bulkAddUnits.isPending ? "Creating…" : "Create Units"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Unit Dialog */}
      <Dialog open={!!unitDialogProperty} onOpenChange={(open) => !open && setUnitDialogProperty(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Add Unit</DialogTitle>
            <DialogDescription>Add a unit to this property.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUnit} className="space-y-4 pt-2">
            <UnitFormFields />
            <Button type="submit" className="w-full" disabled={addUnit.isPending}>
              {addUnit.isPending ? "Saving…" : "Add Unit"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Property Dialog */}
      <Dialog open={!!editProperty} onOpenChange={(open) => !open && setEditProperty(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Property</DialogTitle>
            <DialogDescription>Update property details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProperty} className="space-y-4 pt-2">
            <PropertyFormFields defaults={editProperty} />
            <Button type="submit" className="w-full" disabled={updateProperty.isPending}>
              {updateProperty.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Unit Dialog */}
      <Dialog open={!!editUnit} onOpenChange={(open) => !open && setEditUnit(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Unit</DialogTitle>
            <DialogDescription>Update unit details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUnit} className="space-y-4 pt-2">
            <UnitFormFields defaults={editUnit} />
            <Button type="submit" className="w-full" disabled={updateUnit.isPending}>
              {updateUnit.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Property Confirmation */}
      <AlertDialog open={!!deletePropertyId} onOpenChange={(open) => !open && setDeletePropertyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this property and all its units. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletePropertyId && deleteProperty.mutate(deletePropertyId)}
            >
              {deleteProperty.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Unit Confirmation */}
      <AlertDialog open={!!deleteUnitId} onOpenChange={(open) => !open && setDeleteUnitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this unit. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteUnitId && deleteUnit.mutate(deleteUnitId)}
            >
              {deleteUnit.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Properties;
