import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

interface ReportData {
  month: number; // 0-indexed
  year: number;
  properties: any[];
  units: any[];
  payments: any[];
  maintenanceRequests: any[];
  profiles: any[];
}

async function fetchReportData(month: number, year: number): Promise<ReportData> {
  const startOfMonth = new Date(year, month, 1).toISOString().split("T")[0];
  const endOfMonth = new Date(year, month + 1, 0).toISOString().split("T")[0];

  const [propertiesRes, unitsRes, paymentsRes, maintenanceRes] = await Promise.all([
    supabase.from("properties").select("id, name, address, total_units"),
    supabase.from("units").select("id, unit_number, status, tenant_id, rent_amount, property_id"),
    supabase
      .from("payments")
      .select("id, amount, status, payment_date, payment_method, mpesa_ref, tenant_id, unit_id, units!inner(unit_number, property_id)")
      .gte("payment_date", startOfMonth)
      .lte("payment_date", endOfMonth),
    supabase
      .from("maintenance_requests")
      .select("id, title, priority, status, created_at, unit_id")
      .gte("created_at", `${startOfMonth}T00:00:00`)
      .lte("created_at", `${endOfMonth}T23:59:59`),
  ]);

  if (propertiesRes.error) throw propertiesRes.error;
  if (unitsRes.error) throw unitsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;
  if (maintenanceRes.error) throw maintenanceRes.error;

  const tenantIds = [...new Set(unitsRes.data.filter(u => u.tenant_id).map(u => u.tenant_id!))];
  let profiles: any[] = [];
  if (tenantIds.length > 0) {
    const { data } = await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", tenantIds);
    profiles = data || [];
  }

  return {
    month,
    year,
    properties: propertiesRes.data,
    units: unitsRes.data,
    payments: paymentsRes.data,
    maintenanceRequests: maintenanceRes.data,
    profiles,
  };
}

function getMonthName(month: number): string {
  return new Date(2000, month).toLocaleString("en-US", { month: "long" });
}

export async function generateMonthlyReport(month: number, year: number): Promise<void> {
  const data = await fetchReportData(month, year);
  const doc = new jsPDF();
  const monthName = getMonthName(month);
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // ── Header ──
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Monthly Property Report", pageWidth / 2, y, { align: "center" });
  y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(`${monthName} ${year}`, pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated on ${new Date().toLocaleDateString("en-KE")}`, pageWidth / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 10;

  // Divider
  doc.setDrawColor(200);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // ── 1. Rent Collection Summary ──
  const totalUnits = data.units.length;
  const occupiedUnits = data.units.filter(u => u.status === "occupied");
  const expectedRent = occupiedUnits.reduce((s, u) => s + Number(u.rent_amount), 0);
  const completedPayments = data.payments.filter(p => p.status === "completed");
  const collected = completedPayments.reduce((s, p) => s + Number(p.amount), 0);
  const collectionRate = expectedRent > 0 ? ((collected / expectedRent) * 100).toFixed(1) : "0";
  const outstanding = expectedRent - collected;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("1. Rent Collection Summary", 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Expected Rent", `KES ${expectedRent.toLocaleString()}`],
      ["Collected", `KES ${collected.toLocaleString()}`],
      ["Outstanding", `KES ${outstanding.toLocaleString()}`],
      ["Collection Rate", `${collectionRate}%`],
      ["Total Payments", String(data.payments.length)],
      ["Completed Payments", String(completedPayments.length)],
    ],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── 2. Property & Occupancy Overview ──
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("2. Property & Occupancy Overview", 14, y);
  y += 6;

  const propertyRows = data.properties.map(p => {
    const pUnits = data.units.filter(u => u.property_id === p.id);
    const pOccupied = pUnits.filter(u => u.status === "occupied").length;
    const pVacant = pUnits.length - pOccupied;
    const occRate = pUnits.length > 0 ? ((pOccupied / pUnits.length) * 100).toFixed(0) : "0";
    return [p.name, String(pUnits.length), String(pOccupied), String(pVacant), `${occRate}%`];
  });

  // Totals row
  const vacantCount = totalUnits - occupiedUnits.length;
  const totalOccRate = totalUnits > 0 ? ((occupiedUnits.length / totalUnits) * 100).toFixed(0) : "0";
  propertyRows.push(["TOTAL", String(totalUnits), String(occupiedUnits.length), String(vacantCount), `${totalOccRate}%`]);

  autoTable(doc, {
    startY: y,
    head: [["Property", "Units", "Occupied", "Vacant", "Occupancy"]],
    body: propertyRows,
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
    didParseCell: (hookData) => {
      if (hookData.row.index === propertyRows.length - 1 && hookData.section === "body") {
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── 3. Payment Breakdown ──
  if (y > 240) { doc.addPage(); y = 20; }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("3. Payment Breakdown", 14, y);
  y += 6;

  // Payment method summary
  const mpesaPayments = data.payments.filter(p => p.mpesa_ref);
  const cashPayments = data.payments.filter(p => !p.mpesa_ref);
  const mpesaTotal = mpesaPayments.reduce((s, p) => s + Number(p.amount), 0);
  const cashTotal = cashPayments.reduce((s, p) => s + Number(p.amount), 0);

  autoTable(doc, {
    startY: y,
    head: [["Payment Method", "Count", "Total Amount"]],
    body: [
      ["M-Pesa", String(mpesaPayments.length), `KES ${mpesaTotal.toLocaleString()}`],
      ["Cash", String(cashPayments.length), `KES ${cashTotal.toLocaleString()}`],
      ["Total", String(data.payments.length), `KES ${collected.toLocaleString()}`],
    ],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Individual payments list
  if (data.payments.length > 0) {
    const paymentRows = data.payments.map(p => {
      const profile = data.profiles.find(pr => pr.user_id === p.tenant_id);
      const unitNum = (p.units as any)?.unit_number || "—";
      return [
        profile?.full_name || "Unknown",
        unitNum,
        `KES ${Number(p.amount).toLocaleString()}`,
        p.mpesa_ref ? "M-Pesa" : "Cash",
        p.mpesa_ref || "—",
        new Date(p.payment_date).toLocaleDateString("en-KE"),
        p.status,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Tenant", "Unit", "Amount", "Method", "Ref", "Date", "Status"]],
      body: paymentRows,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      columnStyles: { 4: { cellWidth: 28 } },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── 4. Overdue Tenants ──
  if (y > 240) { doc.addPage(); y = 20; }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("4. Overdue Tenants", 14, y);
  y += 6;

  const paidTenantIds = new Set(completedPayments.map(p => p.tenant_id));
  const overdueUnits = occupiedUnits.filter(u => !paidTenantIds.has(u.tenant_id));

  if (overdueUnits.length === 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("No overdue tenants this month. All rents collected!", 14, y);
    y += 8;
  } else {
    const overdueRows = overdueUnits.map(u => {
      const profile = data.profiles.find(pr => pr.user_id === u.tenant_id);
      const prop = data.properties.find(p => p.id === u.property_id);
      return [
        profile?.full_name || "Unknown",
        profile?.phone || "—",
        u.unit_number,
        prop?.name || "—",
        `KES ${Number(u.rent_amount).toLocaleString()}`,
      ];
    });

    const totalOverdue = overdueUnits.reduce((s, u) => s + Number(u.rent_amount), 0);

    autoTable(doc, {
      startY: y,
      head: [["Tenant", "Phone", "Unit", "Property", "Rent Due"]],
      body: overdueRows,
      foot: [["", "", "", "Total Overdue", `KES ${totalOverdue.toLocaleString()}`]],
      theme: "grid",
      headStyles: { fillColor: [220, 38, 38], fontSize: 10 },
      footStyles: { fillColor: [254, 226, 226], textColor: [180, 0, 0], fontStyle: "bold" },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── 5. Maintenance Overview ──
  if (y > 240) { doc.addPage(); y = 20; }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("5. Maintenance Requests", 14, y);
  y += 6;

  const openReqs = data.maintenanceRequests.filter(r => r.status === "open").length;
  const inProgressReqs = data.maintenanceRequests.filter(r => r.status === "in_progress").length;
  const resolvedReqs = data.maintenanceRequests.filter(r => r.status === "resolved" || r.status === "completed").length;

  autoTable(doc, {
    startY: y,
    head: [["Status", "Count"]],
    body: [
      ["Open", String(openReqs)],
      ["In Progress", String(inProgressReqs)],
      ["Resolved", String(resolvedReqs)],
      ["Total", String(data.maintenanceRequests.length)],
    ],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  if (data.maintenanceRequests.length > 0) {
    const maintRows = data.maintenanceRequests.map(r => {
      const unit = data.units.find(u => u.id === r.unit_id);
      return [
        r.title,
        unit?.unit_number || "—",
        r.priority,
        r.status,
        new Date(r.created_at).toLocaleDateString("en-KE"),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Title", "Unit", "Priority", "Status", "Date"]],
      body: maintRows,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount} · RentFlow Monthly Report · ${monthName} ${year}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  doc.save(`Monthly_Report_${monthName}_${year}.pdf`);
}
