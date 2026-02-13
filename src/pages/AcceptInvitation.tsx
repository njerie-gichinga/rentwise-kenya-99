import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Building2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("id");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [status, setStatus] = useState<"loading" | "needs-signup" | "accepting" | "accepted" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [acceptedData, setAcceptedData] = useState<{ unit_number: string; property_name: string; rent_amount: number } | null>(null);

  // Signup form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  // Fetch invitation details for pre-filling
  useEffect(() => {
    if (!invitationId) {
      setStatus("error");
      setErrorMsg("Invalid invitation link — no invitation ID found.");
      return;
    }

    // Pre-fill from URL params (always available)
    const urlEmail = searchParams.get("email") || "";
    const urlName = searchParams.get("name") || "";
    if (urlEmail) setEmail(urlEmail);
    if (urlName) setName(urlName);

    const fetchInvitation = async () => {
      try {
        const { data, error } = await supabase
          .from("tenant_invitations")
          .select("tenant_name, tenant_email, tenant_phone, status")
          .eq("id", invitationId)
          .maybeSingle();

        if (data) {
          if (data.status !== "pending") {
            setStatus("error");
            setErrorMsg("This invitation has already been used.");
            return;
          }
          setName(data.tenant_name);
          setEmail(data.tenant_email);
          setPhone(data.tenant_phone || "");
        }
      } catch {
        // RLS may block unauthenticated reads — use URL params
      }

      if (!authLoading && !user) {
        setStatus("needs-signup");
      }
    };

    fetchInvitation();
  }, [invitationId, authLoading]);

  // If user is logged in, auto-accept
  useEffect(() => {
    if (!authLoading && user && invitationId && status === "loading") {
      acceptInvitation();
    }
  }, [authLoading, user, invitationId]);

  const acceptInvitation = async () => {
    setStatus("accepting");
    try {
      const { data, error } = await supabase.functions.invoke("accept-invitation", {
        body: { invitation_id: invitationId },
      });

      if (error) throw new Error(error.message || "Failed to accept invitation");
      if (data?.error) throw new Error(data.error);

      setAcceptedData(data);
      setStatus("accepted");

      // Store welcome data for tenant portal
      localStorage.setItem("rentwise_welcome", JSON.stringify(data));

      toast({ title: "Invitation accepted!", description: `You've been assigned to Unit ${data.unit_number}` });
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/accept-invitation?id=${invitationId}`,
          data: { full_name: name, phone, role: "tenant" },
        },
      });

      if (error) throw error;

      toast({
        title: "Check your email",
        description: "We sent a verification link. After confirming, come back to accept your invitation.",
      });
    } catch (err: any) {
      toast({ title: "Sign up failed", description: err.message, variant: "destructive" });
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">RentWise</span>
        </Link>

        <div className="rounded-xl border bg-card p-6 shadow-card">
          {/* Loading */}
          {(status === "loading" || status === "accepting") && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {status === "accepting" ? "Accepting your invitation…" : "Loading invitation…"}
              </p>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <h2 className="font-display text-lg font-semibold text-card-foreground">Invitation Error</h2>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" className="mt-2" onClick={() => navigate("/login")}>
                Go to Login
              </Button>
            </div>
          )}

          {/* Accepted */}
          {status === "accepted" && acceptedData && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle className="h-10 w-10 text-primary" />
              <h2 className="font-display text-lg font-semibold text-card-foreground">Welcome to RentWise!</h2>
              <div className="rounded-lg bg-muted p-4 text-left">
                <p className="text-sm font-medium text-card-foreground">Unit {acceptedData.unit_number}</p>
                <p className="text-xs text-muted-foreground">{acceptedData.property_name}</p>
                <p className="mt-1 text-sm font-semibold text-primary">Rent: KES {acceptedData.rent_amount.toLocaleString()}</p>
              </div>
              <Button className="mt-2 w-full" onClick={() => navigate("/tenant-portal", { replace: true })}>
                Go to Tenant Portal
              </Button>
            </div>
          )}

          {/* Needs signup */}
          {status === "needs-signup" && (
            <>
              <h1 className="font-display text-xl font-semibold text-card-foreground">Accept Your Invitation</h1>
              <p className="mt-1 text-sm text-muted-foreground">Create your account to get started</p>

              <form onSubmit={handleSignup} className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone (M-Pesa)</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                </div>
                <Button type="submit" className="w-full" disabled={signupLoading}>
                  {signupLoading ? "Creating account…" : "Create Account & Accept"}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to={`/login?redirect=/accept-invitation?id=${invitationId}`} className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;
