import PDFDocument from "pdfkit";
import { stringify } from "csv-stringify/sync";
import type { Writable } from "stream";

// ── CSV Export ──
export function generateCSV(
  headers: string[],
  rows: Array<Record<string, unknown>>,
): string {
  const data = rows.map((row) => headers.map((h) => row[h] ?? ""));
  return stringify([headers, ...data]);
}

// ── PDF Export — Employee Performance ──
export function generatePerformancePDF(
  data: {
    employees: Array<{
      employee: { name: string; email: string };
      metrics: {
        totalAssigned: number;
        confirmed: number;
        confirmationRate: number;
        avgResponseHours: number | null;
        overdueFollowUps: number;
        followUpComplianceRate: number;
        performanceScore: number;
      };
    }>;
    period: { from: Date; to: Date };
  },
  stream: Writable,
): void {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(stream);

  // Header
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("Employee Performance Report", { align: "center" });

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(
      `Period: ${data.period.from.toDateString()} → ${data.period.to.toDateString()}`,
      { align: "center" },
    );

  doc.moveDown(1.5);

  // Table header
  const cols = {
    name: 50,
    assigned: 220,
    confirmed: 290,
    rate: 355,
    score: 430,
  };

  doc.fontSize(9).font("Helvetica-Bold");
  doc.text("Employee", cols.name, doc.y);
  doc.text("Assigned", cols.assigned, doc.y - doc.currentLineHeight());
  doc.text("Confirmed", cols.confirmed, doc.y - doc.currentLineHeight());
  doc.text("Rate %", cols.rate, doc.y - doc.currentLineHeight());
  doc.text("Score", cols.score, doc.y - doc.currentLineHeight());

  doc.moveDown(0.3);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);

  // Rows
  doc.font("Helvetica").fontSize(9);

  for (const item of data.employees) {
    const y = doc.y;
    doc.text(item.employee.name, cols.name, y, { width: 160 });
    doc.text(String(item.metrics.totalAssigned), cols.assigned, y);
    doc.text(String(item.metrics.confirmed), cols.confirmed, y);
    doc.text(`${item.metrics.confirmationRate}%`, cols.rate, y);

    // Color code performance score
    const score = item.metrics.performanceScore;
    const color = score >= 70 ? "#16a34a" : score >= 40 ? "#d97706" : "#dc2626";
    doc.fillColor(color).text(String(score), cols.score, y);
    doc.fillColor("#000000");

    doc.moveDown(0.6);
  }

  doc.end();
}

// ── PDF Export — Client Deals ──
export function generateConfirmedPDF(
  data: {
    summary: {
      totalClients: number;
      totalDealValue: number;
    };
    leads: Array<{
      name: string | null;
      phone: string;
      confirmedAt: Date | null;
      assignedTo: { name: string } | null;
      dealValue: number;
      servicesSold: string[];
    }>;
    period: { from: Date; to: Date };
  },
  stream: Writable,
): void {
  const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
  doc.pipe(stream);

  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("Client Deals Report", { align: "center" });

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(
      `Period: ${data.period.from.toDateString()} → ${data.period.to.toDateString()}`,
      { align: "center" },
    );

  doc.moveDown();

  doc.fontSize(11).font("Helvetica-Bold");
  doc.text(`Total Clients: ${data.summary.totalClients}   |   `);
  doc.text(`Total Deal Value: ₹${data.summary.totalDealValue.toLocaleString("en-IN")}`);

  doc.moveDown();
  doc.moveTo(40, doc.y).lineTo(800, doc.y).stroke();
  doc.moveDown(0.5);

  const cols = {
    name: 40,
    phone: 180,
    services: 270,
    counsellor: 480,
    deal: 600,
    closedAt: 660,
  };

  doc.fontSize(8).font("Helvetica-Bold");
  doc.text("Name", cols.name, doc.y);
  doc.text("Phone", cols.phone, doc.y - doc.currentLineHeight());
  doc.text("Services", cols.services, doc.y - doc.currentLineHeight());
  doc.text("Counsellor", cols.counsellor, doc.y - doc.currentLineHeight());
  doc.text("Deal ₹", cols.deal, doc.y - doc.currentLineHeight());
  doc.text("Closed", cols.closedAt, doc.y - doc.currentLineHeight());

  doc.moveDown(0.3);
  doc.moveTo(40, doc.y).lineTo(800, doc.y).stroke();
  doc.moveDown(0.3);

  doc.font("Helvetica").fontSize(8);

  for (const lead of data.leads) {
    if (doc.y > 520) {
      doc.addPage();
      doc.y = 40;
    }

    const y = doc.y;
    doc.text(lead.name ?? "—", cols.name, y, { width: 130 });
    doc.text(lead.phone, cols.phone, y);
    doc.text(lead.servicesSold.join(", "), cols.services, y, { width: 200 });
    doc.text(lead.assignedTo?.name ?? "—", cols.counsellor, y, { width: 110 });
    doc.text(`₹${lead.dealValue.toLocaleString("en-IN")}`, cols.deal, y);
    doc.text(lead.confirmedAt?.toDateString() ?? "—", cols.closedAt, y);
    doc.moveDown(0.6);
  }

  doc.end();
}
