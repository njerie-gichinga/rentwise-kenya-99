import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Share2, Printer } from "lucide-react";
import { useRef } from "react";
import { toast } from "@/hooks/use-toast";

export interface ReceiptData {
  id: string;
  tenant_name: string;
  unit_number: string;
  property_name: string;
  amount: number;
  method: string;
  mpesa_ref: string | null;
  status: string;
  payment_date: string;
}

interface PaymentReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: ReceiptData | null;
}

const PaymentReceipt = ({ open, onOpenChange, payment }: PaymentReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!payment) return null;

  const formattedDate = new Date(payment.payment_date).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const receiptNumber = `RCP-${payment.id.slice(0, 8).toUpperCase()}`;

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${receiptNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 32px; color: #1a1a1a; max-width: 400px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 24px; }
            .header h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
            .header p { font-size: 12px; color: #666; }
            .receipt-no { text-align: center; font-size: 11px; color: #888; margin-bottom: 20px; letter-spacing: 0.5px; }
            .divider { border: none; border-top: 1px dashed #ccc; margin: 16px 0; }
            .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
            .row .label { color: #666; }
            .row .value { font-weight: 500; text-align: right; }
            .total { font-size: 16px; font-weight: 700; }
            .status { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
            .status.completed { background: #e6f4ea; color: #1a7a3a; }
            .status.pending { background: #fff4e5; color: #b45309; }
            .footer { text-align: center; margin-top: 28px; font-size: 11px; color: #999; }
            @media print { body { padding: 16px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Payment Receipt</h1>
            <p>${payment.property_name}</p>
          </div>
          <div class="receipt-no">${receiptNumber}</div>
          <hr class="divider" />
          <div class="row"><span class="label">Tenant</span><span class="value">${payment.tenant_name}</span></div>
          <div class="row"><span class="label">Unit</span><span class="value">${payment.unit_number}</span></div>
          <div class="row"><span class="label">Date</span><span class="value">${formattedDate}</span></div>
          <div class="row"><span class="label">Method</span><span class="value">${payment.method}</span></div>
          ${payment.mpesa_ref ? `<div class="row"><span class="label">M-Pesa Ref</span><span class="value" style="font-family:monospace">${payment.mpesa_ref}</span></div>` : ""}
          <hr class="divider" />
          <div class="row total"><span class="label">Amount Paid</span><span class="value">KES ${payment.amount.toLocaleString()}</span></div>
          <div class="row" style="justify-content:center; padding-top: 12px;">
            <span class="status ${payment.status}">${payment.status}</span>
          </div>
          <div class="footer">
            <p>Thank you for your payment.</p>
            <p style="margin-top: 4px;">Generated on ${new Date().toLocaleDateString("en-KE")}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleShare = async () => {
    const text = `Payment Receipt ${receiptNumber}\n\nTenant: ${payment.tenant_name}\nUnit: ${payment.unit_number}\nProperty: ${payment.property_name}\nAmount: KES ${payment.amount.toLocaleString()}\nDate: ${formattedDate}\nMethod: ${payment.method}${payment.mpesa_ref ? `\nRef: ${payment.mpesa_ref}` : ""}\nStatus: ${payment.status}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Receipt ${receiptNumber}`, text });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard", description: "Receipt details copied — paste to share." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Payment Receipt</DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="space-y-4 pt-1">
          <p className="text-center text-xs text-muted-foreground tracking-wide">{receiptNumber}</p>

          <Separator className="border-dashed" />

          <div className="space-y-2 text-sm">
            <Row label="Tenant" value={payment.tenant_name} />
            <Row label="Unit" value={payment.unit_number} />
            <Row label="Property" value={payment.property_name} />
            <Row label="Date" value={formattedDate} />
            <Row label="Method" value={payment.method} />
            {payment.mpesa_ref && <Row label="M-Pesa Ref" value={payment.mpesa_ref} mono />}
          </div>

          <Separator className="border-dashed" />

          <div className="flex items-center justify-between text-base font-bold">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="text-foreground">KES {payment.amount.toLocaleString()}</span>
          </div>

          <div className="flex justify-center">
            <span
              className={`inline-block rounded-full px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                payment.status === "completed"
                  ? "bg-primary/10 text-primary"
                  : "bg-accent/15 text-accent-foreground"
              }`}
            >
              {payment.status}
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 gap-1.5" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print / PDF
          </Button>
          <Button variant="outline" className="flex-1 gap-1.5" onClick={handleShare}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-medium text-card-foreground ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
  </div>
);

export default PaymentReceipt;
