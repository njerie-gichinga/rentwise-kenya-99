import { useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_landlord_account");
      if (error) throw error;
      toast({ title: "Account deleted", description: "Your account and all data have been permanently removed." });
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete account", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          <span>Delete Account</span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete Account</DialogTitle>
          <DialogDescription>
            This will <strong>permanently delete</strong> your account and all associated data including properties, units, tenants, payments, and maintenance requests. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Type <span className="font-mono font-bold text-foreground">DELETE</span> to confirm:
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE"
            className="font-mono"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmText !== "DELETE" || deleting}
          >
            {deleting ? "Deleting…" : "Delete Everything"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
