import { Link } from "react-router-dom";
import { Building2, CreditCard, Shield, Smartphone, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    icon: Smartphone,
    title: "Mobile-First",
    description: "Install like a native app. Works offline — view your dashboard, properties, and payments anytime.",
  },
  {
    icon: CreditCard,
    title: "M-Pesa Built In",
    description: "One-tap rent collection via STK Push. Automatic reconciliation and SMS receipts.",
  },
  {
    icon: Users,
    title: "Tenant Portal",
    description: "Tenants pay rent, view balances, and submit maintenance requests — all from their phone.",
  },
  {
    icon: Building2,
    title: "Property Management",
    description: "Track units, occupancy, leases, and payments across all your properties in one place.",
  },
  {
    icon: Shield,
    title: "Reliable & Secure",
    description: "Bank-grade security. SMS fallback for tenants without smartphones or data.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">RentEase</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl text-balance">
            Manage rentals easily with M-Pesa & mobile convenience
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg text-balance">
            Built for Kenyan landlords who manage 1–10 properties. Collect rent via M-Pesa, 
            track tenants, and run your business from your phone — even offline.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link to="/signup">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
              <Link to="/login">I have an account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t bg-card py-16 md:py-20">
        <div className="container">
          <h2 className="font-display text-center text-2xl font-semibold text-foreground">
            Everything you need to manage rentals
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="rounded-xl border bg-background p-5 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-foreground">{b.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 text-center">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Ready to simplify your rental business?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Free to start. No credit card required.
        </p>
        <Button size="lg" className="mt-6" asChild>
          <Link to="/signup">
            Create your account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
          <span>© 2026 RentEase Kenya</span>
          <span>Built for Kenyan landlords 🇰🇪</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
