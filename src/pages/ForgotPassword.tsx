import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">RentWise</span>
        </Link>

        <div className="rounded-xl border bg-card p-6 shadow-card">
          {sent ? (
            <div className="text-center space-y-2">
              <h1 className="font-display text-xl font-semibold text-card-foreground">Check your email</h1>
              <p className="text-sm text-muted-foreground">We sent a password reset link to <strong>{email}</strong>. Click the link in the email to reset your password.</p>
              <Button variant="outline" className="mt-4 w-full" onClick={() => setSent(false)}>Send again</Button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-xl font-semibold text-card-foreground">Forgot password?</h1>
              <p className="mt-1 text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
