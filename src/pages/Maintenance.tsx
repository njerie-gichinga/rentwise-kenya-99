import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Wrench, Plus, CheckCircle2, Clock, AlertTriangle, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const priorityStyles: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/10 text-warning",
  low: "bg-muted text-muted-foreground",
};

const statusStyles: Record<string, string> = {
  open: "bg-warning/10 text-warning",
  in_progress: "bg-blue-500/10 text-blue-600",
  completed: "bg-primary/10 text-primary",
};

const statusIcons: Record<string, React.ReactNode> = {
  open: <Clock className="h-3.5 w-3.5" />,
  in_progress: <AlertTriangle className="h-3.5 w-3.5" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5" />,
};

const Maintenance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [unitId, setUnitId] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Fetch units for this landlord (to assign requests)
  const { data: units = [] } = useQuery({
    queryKey: ["landlord-units", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, properties!inner(name)")
        .order("unit_number");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch maintenance requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["maintenance-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*, units!inner(unit_number, properties!inner(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Create request
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("maintenance_requests").insert({
        title,
        description,
        priority,
        unit_id: unitId,
        tenant_id: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      toast({ title: "Request created" });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setPriority("medium");
      setUnitId("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Update status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Filtered & sorted requests
  const filteredRequests = useMemo(() => {
    let result = [...requests];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r: any) =>
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        (r.units as any)?.unit_number?.toLowerCase().includes(q) ||
        (r.units as any)?.properties?.name?.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") result = result.filter((r: any) => r.status === filterStatus);
    if (filterPriority !== "all") result = result.filter((r: any) => r.priority === filterPriority);
    result.sort((a: any, b: any) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1);
    });
    return result;
  }, [requests, searchQuery, filterStatus, filterPriority, sortBy]);

  const activeFilterCount = [filterStatus !== "all", filterPriority !== "all", searchQuery !== ""].filter(Boolean).length;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Maintenance</h1>
            <p className="text-sm text-muted-foreground">Track repair and maintenance requests</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Maintenance Request</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Select value={unitId} onValueChange={setUnitId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {(u.properties as any)?.name} — Unit {u.unit_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Leaking kitchen tap" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue…" rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || !unitId}>
                  {createMutation.isPending ? "Creating…" : "Create Request"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search requests…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearchQuery(""); setFilterStatus("all"); setFilterPriority("all"); setSortBy("newest"); }}>
              Clear filters
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading requests…</p>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center shadow-card">
            <Wrench className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              {requests.length === 0 ? "No maintenance requests yet." : "No requests match your filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((r: any) => (
              <div key={r.id} className="rounded-xl border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-card-foreground truncate">{r.title}</p>
                      {r.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
                      )}
                      {r.image_url && (
                        <img src={r.image_url} alt="Issue photo" className="mt-2 rounded-lg border max-h-32 object-cover" />
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {(r.units as any)?.properties?.name} · Unit {(r.units as any)?.unit_number} · {new Date(r.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityStyles[r.priority]}`}>
                      {r.priority}
                    </span>
                    <Select
                      value={r.status}
                      onValueChange={(val) => updateStatusMutation.mutate({ id: r.id, status: val })}
                    >
                      <SelectTrigger className="h-7 w-[120px] text-[11px] border-0 bg-transparent p-0">
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles[r.status]}`}>
                          {statusIcons[r.status]}
                          {r.status.replace("_", " ")}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Maintenance;
