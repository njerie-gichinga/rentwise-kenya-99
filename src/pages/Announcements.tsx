import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Megaphone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const Announcements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [sendSms, setSendSms] = useState(false);

  // Fetch landlord's properties
  const { data: properties = [] } = useQuery({
    queryKey: ["announcement-properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id, name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch occupied units with tenants
  const { data: units = [] } = useQuery({
    queryKey: ["announcement-units", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, tenant_id, property_id")
        .eq("status", "occupied")
        .not("tenant_id", "is", null);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch tenant profiles for phone numbers
  const tenantIds = [...new Set(units.map((u: any) => u.tenant_id).filter(Boolean))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["announcement-profiles", tenantIds],
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

  const filteredUnits = propertyFilter === "all"
    ? units
    : units.filter((u: any) => u.property_id === propertyFilter);

  const recipientCount = filteredUnits.length;

  const sendMutation = useMutation({
    mutationFn: async () => {
      const targetTenantIds = filteredUnits.map((u: any) => u.tenant_id);
      if (targetTenantIds.length === 0) throw new Error("No tenants to notify");

      const phoneNumbers = sendSms
        ? profiles
            .filter((p: any) => targetTenantIds.includes(p.user_id) && p.phone)
            .map((p: any) => p.phone)
        : [];

      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          user_ids: targetTenantIds,
          title: title.trim(),
          message: message.trim(),
          type: "announcement",
          send_sms: sendSms,
          phone_numbers: phoneNumbers,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Announcement sent",
        description: `Notified ${data.notifications_created} tenant(s)${data.sms?.sent ? ` + ${data.sms.sent} SMS` : ""}.`,
      });
      setTitle("");
      setMessage("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground">Broadcast messages to your tenants</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-card space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-card-foreground">New Announcement</h2>
              <p className="text-xs text-muted-foreground">{recipientCount} tenant(s) will be notified</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ann-title">Title</Label>
              <Input
                id="ann-title"
                placeholder="e.g. Water outage tomorrow"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ann-message">Message</Label>
              <Textarea
                id="ann-message"
                placeholder="Write your announcement here…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                rows={4}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={sendSms}
                onChange={(e) => setSendSms(e.target.checked)}
                className="rounded border-input"
              />
              Also send via SMS (for feature phone users)
            </label>

            <Button
              className="w-full"
              disabled={!title.trim() || !message.trim() || recipientCount === 0 || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
            >
              <Send className="mr-2 h-4 w-4" />
              {sendMutation.isPending ? "Sending…" : `Send to ${recipientCount} tenant(s)`}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Announcements;
