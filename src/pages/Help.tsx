import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Building2, LogOut, ArrowLeftRight, HelpCircle, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ── Manual content ────────────────────────────────── */

const gettingStarted = {
  title: "Getting Started",
  sections: [
    {
      q: "How do I create an account?",
      a: `Visit the Sign Up page and fill in your full name, email, phone number, and password. Choose your role (Landlord or Tenant). After signing up you'll receive a verification email — click the link to activate your account, then log in.`,
    },
    {
      q: "How do I log in?",
      a: `Go to the Login page and enter your email and password. If you've forgotten your password, click "Forgot password?" to receive a reset link via email.`,
    },
    {
      q: "How do I reset my password?",
      a: `Click "Forgot password?" on the login page. Enter your email and we'll send a reset link. Click the link, then set a new password on the reset page.`,
    },
  ],
};

const landlordSections = [
  {
    title: "Dashboard Overview",
    sections: [
      {
        q: "What does the Dashboard show?",
        a: `The Dashboard gives you a bird's-eye view of your rental portfolio:\n• **Properties** — Total number of properties and units\n• **Tenants** — Occupied vs vacant units\n• **Collected** — Rent collected this month\n• **Overdue** — Outstanding rent and number of tenants behind\n• **Recent Payments** — The latest 5 payments with tenant name, unit, amount, and method`,
      },
    ],
  },
  {
    title: "Managing Properties",
    sections: [
      {
        q: "How do I add a property?",
        a: `Navigate to **Properties** from the sidebar, then click **"Add Property"**. Fill in the property name, address, type (apartment, house, commercial, or other), and number of units. Click **Save** to create it.`,
      },
      {
        q: "How do I edit or delete a property?",
        a: `On the Properties page, each property card has an **Edit** and **Delete** button. Editing lets you change the name, address, and type. Deleting a property will **permanently remove** all its units, tenant assignments, payments, and maintenance requests.`,
      },
    ],
  },
  {
    title: "Managing Units",
    sections: [
      {
        q: "How do I add units?",
        a: `Go to the **Units** page from the sidebar. Click **"Add Unit"**, select the property it belongs to, enter the unit number, and set the rent amount. The unit will be created with a "vacant" status.`,
      },
      {
        q: "How do I update rent or unit details?",
        a: `On the Units page, click the **Edit** button on any unit card to update the unit number or rent amount.`,
      },
    ],
  },
  {
    title: "Tenant Management",
    sections: [
      {
        q: "How do I invite a tenant?",
        a: `Go to the **Tenants** page and click **"Invite Tenant"**. Enter the tenant's name, email, phone number, and select the unit to assign them to. An invitation email will be sent to the tenant with a link to create their account and accept the invitation.`,
      },
      {
        q: "What happens when a tenant accepts an invitation?",
        a: `When the tenant clicks the invitation link, they'll create an account (or log in if they already have one). They'll be automatically assigned to the unit, and the unit status changes to "occupied". The tenant can then access their Tenant Portal.`,
      },
      {
        q: "How do I remove a tenant?",
        a: `On the Units page, you can unassign a tenant from their unit. This will set the unit back to "vacant" status.`,
      },
    ],
  },
  {
    title: "Payments & Rent Collection",
    sections: [
      {
        q: "How do I record a payment?",
        a: `Go to the **Payments** page and click **"Record Payment"**. Select the unit, enter the amount, choose the payment method (Cash, M-Pesa, or Bank Transfer), and optionally add an M-Pesa reference number. Click **Save** to record it.`,
      },
      {
        q: "How does M-Pesa payment work?",
        a: `Tenants can pay rent directly via M-Pesa from their Tenant Portal. When they initiate payment, an STK push is sent to their phone. Once they enter their PIN, the payment is automatically recorded and linked to their unit.`,
      },
      {
        q: "How do I view payment history?",
        a: `The Payments page shows all payments with filters. You can see payment date, amount, method, M-Pesa reference, and status (completed or pending).`,
      },
      {
        q: "How do I send rent reminders?",
        a: `Rent reminders can be sent automatically to tenants who haven't paid for the current month. The system identifies overdue tenants and notifies them via email/SMS.`,
      },
    ],
  },
  {
    title: "Maintenance Requests",
    sections: [
      {
        q: "How do I view maintenance requests?",
        a: `Go to the **Maintenance** page from the sidebar. You'll see all requests from your tenants, organized by status (open, in progress, completed). Each request shows the title, description, priority level, tenant name, unit, and any attached photos.`,
      },
      {
        q: "How do I update a maintenance request?",
        a: `Click on any request to update its status. You can mark it as "in progress" when work begins, or "completed" when the issue is resolved. The tenant will be notified of status changes.`,
      },
    ],
  },
  {
    title: "Announcements",
    sections: [
      {
        q: "How do I send announcements?",
        a: `Go to the **Announcements** page and click **"New Announcement"**. Write your message and select which tenants or properties to notify. Announcements are delivered as in-app notifications.`,
      },
    ],
  },
  {
    title: "Account Settings",
    sections: [
      {
        q: "How do I switch between Landlord and Tenant views?",
        a: `If you have both landlord and tenant roles, use the **Role Switcher** in the sidebar footer to toggle between the Landlord Dashboard and Tenant Portal.`,
      },
      {
        q: "How do I delete my account?",
        a: `Click **"Delete Account"** in the sidebar footer. You'll be asked to type DELETE to confirm. This permanently removes your account and **all** associated data — properties, units, tenants, payments, and maintenance requests. This action cannot be undone.`,
      },
    ],
  },
];

const tenantSections = [
  {
    title: "Your Tenant Portal",
    sections: [
      {
        q: "What is the Tenant Portal?",
        a: `The Tenant Portal is your personal dashboard where you can view your assigned unit, pay rent, submit maintenance requests, and see your payment history — all in one place.`,
      },
      {
        q: "How do I access the Tenant Portal?",
        a: `After accepting your landlord's invitation and logging in, you'll be automatically directed to the Tenant Portal. You can see your unit number, property name, and rent amount.`,
      },
    ],
  },
  {
    title: "Paying Rent",
    sections: [
      {
        q: "How do I pay rent?",
        a: `On your Tenant Portal, click the **"Pay Rent"** button. Enter your M-Pesa phone number and click **"Pay Now"**. You'll receive an STK push notification on your phone — enter your M-Pesa PIN to complete the payment.`,
      },
      {
        q: "How do I view my payment history?",
        a: `Your payment history is displayed on the Tenant Portal under the **"Payment History"** section. It shows the date, amount, payment method, and M-Pesa reference for each payment.`,
      },
      {
        q: "What if my M-Pesa payment fails?",
        a: `If the STK push times out or you cancel it, no payment is recorded. You can try again by clicking "Pay Rent". If money was deducted but the payment doesn't appear, contact your landlord with the M-Pesa confirmation message.`,
      },
    ],
  },
  {
    title: "Maintenance Requests",
    sections: [
      {
        q: "How do I report a repair issue?",
        a: `Click the **"Request Repair"** button on your portal. Enter a short title describing the problem (e.g., "Leaking kitchen tap"), add optional details, set the priority level (low, medium, or high), and optionally attach a photo. Click **"Submit Request"** — your landlord will be notified immediately.`,
      },
      {
        q: "How do I track my maintenance requests?",
        a: `All your submitted requests appear in the **"Maintenance Requests"** section of your portal. Each request shows its current status:\n• **Open** — Submitted, waiting for landlord action\n• **In Progress** — Your landlord is working on it\n• **Completed** — The issue has been resolved`,
      },
      {
        q: "Can I attach photos to a request?",
        a: `Yes! When submitting a repair request, click **"Add a photo"** to attach an image of the issue (max 5MB). This helps your landlord understand the problem better.`,
      },
    ],
  },
  {
    title: "Notifications",
    sections: [
      {
        q: "How do I view notifications?",
        a: `Click the **bell icon** in the top-right corner of the portal. You'll see announcements from your landlord, payment confirmations, and maintenance request updates.`,
      },
    ],
  },
  {
    title: "Account",
    sections: [
      {
        q: "How do I switch to Landlord view?",
        a: `If you also have a landlord account, click **"Landlord View"** in the top header bar to switch to the Landlord Dashboard.`,
      },
    ],
  },
];

/* ── Component ─────────────────────────────────────── */

function ManualSection({ group }: { group: { title: string; sections: { q: string; a: string }[] } }) {
  return (
    <div className="space-y-2">
      <h3 className="font-display text-base font-semibold text-foreground">{group.title}</h3>
      <Accordion type="multiple" className="w-full">
        {group.sections.map((s, i) => (
          <AccordionItem key={i} value={`${group.title}-${i}`} className="border-b border-border/50">
            <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3">
              {s.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line pb-4">
              {s.a.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                part.startsWith("**") && part.endsWith("**") ? (
                  <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
                ) : (
                  <span key={j}>{part}</span>
                )
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

/* ── Landlord Help (wrapped in DashboardLayout) ───── */
function LandlordHelp() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">User Manual</h1>
          <p className="text-sm text-muted-foreground mt-1">Everything you need to know about managing your properties with RentEase.</p>
        </div>

        <ManualSection group={gettingStarted} />

        {landlordSections.map((group) => (
          <ManualSection key={group.title} group={group} />
        ))}
      </div>
    </DashboardLayout>
  );
}

/* ── Tenant Help (standalone layout) ───────────────── */
function TenantHelp() {
  const { roles, switchRole, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">RentEase</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="outline" size="sm" asChild>
              <Link to="/tenant-portal">← Back to Portal</Link>
            </Button>
            {roles.includes("landlord") && (
              <Button variant="outline" size="sm" onClick={() => { switchRole("landlord"); navigate("/dashboard", { replace: true }); }}>
                <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" />
                Landlord View
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-3xl space-y-6 py-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Tenant Guide</h1>
          <p className="text-sm text-muted-foreground mt-1">Learn how to use RentEase to pay rent, request repairs, and more.</p>
        </div>

        <ManualSection group={gettingStarted} />

        {tenantSections.map((group) => (
          <ManualSection key={group.title} group={group} />
        ))}
      </div>
    </div>
  );
}

/* ── Exported page — routes by role ────────────────── */
export default function Help() {
  const { role } = useAuth();
  return role === "tenant" ? <TenantHelp /> : <LandlordHelp />;
}
