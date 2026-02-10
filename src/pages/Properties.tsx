import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Home, MoreHorizontal, ChevronDown, ChevronUp } from "lucide-react";
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

const Properties = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [unitDialogProperty, setUnitDialogProperty] = useState<string | null>(null);

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

  // Fetch units for all properties
  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .order("unit_number");
      if (error) throw error;
      return data;
    },
  });

  // Add property mutation
  const addProperty = useMutation({
    mutationFn: async (form: { name: string; address: string; property_type: string; total_units: number }) => {
      const { error } = await supabase.from("properties").insert({
        landlord_id: user!.id,
        name: form.name,
        address: form.address,
        property_type: form.property_type,
        total_units: form.total_units,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast({ title: "Property added!" });
      setAddOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Add unit mutation
  const addUnit = useMutation({
    mutationFn: async (form: { property_id: string; unit_number: string; rent_amount: number; status: string }) => {
      const { error } = await supabase.from("units").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      toast({ title: "Unit added!" });
      setUnitDialogProperty(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

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

  const handleAddUnit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addUnit.mutate({
      property_id: unitDialogProperty!,
      unit_number: fd.get("unit_number") as string,
      rent_amount: parseFloat(fd.get("rent_amount") as string) || 0,
      status: fd.get("status") as string || "vacant",
    });
  };

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
                <div className="space-y-1.5">
                  <Label>Property Name</Label>
                  <Input name="name" placeholder="e.g. Sunrise Apartments" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input name="address" placeholder="e.g. Kilimani, Nairobi" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <select name="property_type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="apartment">Apartment</option>
                      <option value="bedsitter">Bedsitter</option>
                      <option value="stalls">Stalls</option>
                      <option value="house">House</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Total Units</Label>
                    <Input name="total_units" type="number" min={1} defaultValue={1} required />
                  </div>
                </div>
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
                      <button
                        onClick={() => setExpandedProperty(isExpanded ? null : p.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                    <h3 className="mt-3 font-display text-base font-semibold text-card-foreground">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{p.address}</p>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                        {p.property_type}
                      </span>
                      <span className="text-muted-foreground">
                        {occupied}/{total} occupied
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${occupancy}%` }} />
                    </div>
                  </div>

                  {/* Expanded units section */}
                  {isExpanded && (
                    <div className="border-t px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-card-foreground">Units</p>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setUnitDialogProperty(p.id)}>
                          <Plus className="mr-1 h-3 w-3" /> Add Unit
                        </Button>
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

      {/* Add Unit Dialog */}
      <Dialog open={!!unitDialogProperty} onOpenChange={(open) => !open && setUnitDialogProperty(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Add Unit</DialogTitle>
            <DialogDescription>Add a unit to this property.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUnit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Unit Number</Label>
              <Input name="unit_number" placeholder="e.g. A-101" required />
            </div>
            <div className="space-y-1.5">
              <Label>Rent Amount (KES)</Label>
              <Input name="rent_amount" type="number" min={0} placeholder="15000" required />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select name="status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={addUnit.isPending}>
              {addUnit.isPending ? "Saving…" : "Add Unit"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Properties;
