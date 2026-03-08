import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, X, Pencil, Trash2, DoorOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Units = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProperty, setFilterProperty] = useState("all");
  const [editUnit, setEditUnit] = useState<any | null>(null);
  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);

  // Fetch properties for filter dropdown & names
  const { data: properties = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all units with property info
  const { data: units = [], isLoading } = useQuery({
    queryKey: ["units-with-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*, properties!inner(name)")
        .order("unit_number");
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles for tenant names
  const tenantIds = units.filter((u) => u.tenant_id).map((u) => u.tenant_id!);
  const { data: profiles = [] } = useQuery({
    queryKey: ["tenant-profiles", tenantIds],
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

  const profileMap = new Map(profiles.map((p) => [p.user_id, p.full_name]));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["units-with-properties"] });
    queryClient.invalidateQueries({ queryKey: ["units"] });
  };

  const updateUnit = useMutation({
    mutationFn: async (form: { id: string; unit_number: string; rent_amount: number; status: string }) => {
      const { id, ...rest } = form;
      const { error } = await supabase.from("units").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Unit updated!" });
      setEditUnit(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteUnit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("units").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Unit deleted" });
      setDeleteUnitId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

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

  // Filter units
  const filtered = units.filter((u) => {
    const q = searchQuery.toLowerCase();
    const propName = (u as any).properties?.name || "";
    const tenantName = profileMap.get(u.tenant_id || "") || "";
    if (q && !u.unit_number.toLowerCase().includes(q) && !propName.toLowerCase().includes(q) && !tenantName.toLowerCase().includes(q)) return false;
    if (filterStatus !== "all" && u.status !== filterStatus) return false;
    if (filterProperty !== "all" && u.property_id !== filterProperty) return false;
    return true;
  });

  const occupiedCount = units.filter((u) => u.status === "occupied").length;
  const vacantCount = units.filter((u) => u.status === "vacant").length;
  const occupancyRate = units.length > 0 ? Math.round((occupiedCount / units.length) * 100) : 0;
  const totalRent = units.reduce((sum, u) => sum + Number(u.rent_amount), 0);
  const collectedRent = units.filter((u) => u.status === "occupied").reduce((sum, u) => sum + Number(u.rent_amount), 0);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Units</h1>
          <p className="text-sm text-muted-foreground">Manage all your rental units</p>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Units</p>
            <p className="mt-1 font-display text-2xl font-bold text-card-foreground">{units.length}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{occupiedCount} occupied · {vacantCount} vacant</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Occupancy</p>
            <p className="mt-1 font-display text-2xl font-bold text-card-foreground">{occupancyRate}%</p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${occupancyRate}%` }} />
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expected Rent</p>
            <p className="mt-1 font-display text-2xl font-bold text-card-foreground">KES {collectedRent.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">from occupied units</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Portfolio Value</p>
            <p className="mt-1 font-display text-2xl font-bold text-card-foreground">KES {totalRent.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">total rent capacity</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search unit, property or tenant…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={filterProperty} onValueChange={setFilterProperty}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="vacant">Vacant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading units…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center shadow-card">
            <DoorOpen className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              {units.length === 0 ? "No units yet. Add units from the Properties page." : "No units match your filters."}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Rent (KES)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.unit_number}</TableCell>
                    <TableCell className="text-muted-foreground">{(u as any).properties?.name}</TableCell>
                    <TableCell>{u.rent_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === "occupied" ? "default" : "secondary"} className="text-xs">
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.tenant_id ? profileMap.get(u.tenant_id) || "—" : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditUnit(u)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteUnitId(u.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Edit Unit Dialog */}
      <Dialog open={!!editUnit} onOpenChange={(o) => !o && setEditUnit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Unit</DialogTitle>
            <DialogDescription>Update unit details.</DialogDescription>
          </DialogHeader>
          {editUnit && (
            <form onSubmit={handleEditUnit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Unit Number</Label>
                <Input name="unit_number" defaultValue={editUnit.unit_number} required />
              </div>
              <div className="space-y-1.5">
                <Label>Rent Amount (KES)</Label>
                <Input name="rent_amount" type="number" min={0} defaultValue={editUnit.rent_amount} required />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select name="status" defaultValue={editUnit.status} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="vacant">Vacant</option>
                  <option value="occupied">Occupied</option>
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={updateUnit.isPending}>
                {updateUnit.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUnitId} onOpenChange={(o) => !o && setDeleteUnitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. Related data may also be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteUnitId && deleteUnit.mutate(deleteUnitId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Units;
