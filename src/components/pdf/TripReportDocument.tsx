// Purpose: @react-pdf/renderer Document component for bilingual (Tamil/English) trip audit PDF reports — embeds NotoSansTamil font for correct Tamil glyph rendering (U+0B80–U+0BFF), and includes trip summary, expense ledger, member balance table, and settlement transaction list.

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { TripReportPayload } from "@/lib/tripReportData";
import type { ExpenseCategory } from "@/types/expense";
import type { SettlementStatus } from "@/types/settlement";

// ─── Helper: Format Paise → ₹ string ─────────────────────────────────────────

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `\u20B9${rupees.toFixed(2)}`;
}

// ─── Helper: Category Emoji & Label ──────────────────────────────────────────

const CATEGORY_LABELS_EN: Record<ExpenseCategory, string> = {
  fuel: "Fuel",
  toll: "Toll",
  food: "Food",
  tea_snacks: "Tea & Snacks",
  hotel: "Hotel",
  parking: "Parking",
  tickets: "Tickets",
  shopping: "Shopping",
  travel: "Travel",
  miscellaneous: "Misc",
};

const CATEGORY_LABELS_TA: Record<ExpenseCategory, string> = {
  fuel: "எரிபொருள்",
  toll: "டோல் கட்டணம்",
  food: "உணவு",
  tea_snacks: "தேநீர் & சிற்றுண்டி",
  hotel: "தங்குமிடம்",
  parking: "பார்க்கிங்",
  tickets: "டிக்கெட்டுகள்",
  shopping: "கடைபிடிப்பு",
  travel: "பயண",
  miscellaneous: "இதர",
};

// ─── Helper: Settlement Status Label ─────────────────────────────────────────

const STATUS_EN: Record<SettlementStatus, string> = {
  pending: "Pending",
  settled: "Settled",
  disputed: "Disputed",
  replaced: "Replaced",
};

const STATUS_TA: Record<SettlementStatus, string> = {
  pending: "நிலுவையில்",
  settled: "தீர்க்கப்பட்டது",
  disputed: "தகராறு",
  replaced: "மாற்றப்பட்டது",
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "NotoSansTamil",
    fontSize: 9,
    backgroundColor: "#ffffff",
    color: "#1a1a1a",
    paddingTop: 40,
    paddingBottom: 50,
    paddingLeft: 36,
    paddingRight: 36,
  },
  // Header Band
  headerBand: {
    backgroundColor: "#0f766e", // teal-700
    marginHorizontal: -36,
    marginTop: -40,
    paddingHorizontal: 36,
    paddingVertical: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontFamily: "NotoSansTamil",
    fontWeight: "bold",
    fontSize: 18,
    color: "#ffffff",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontFamily: "NotoSansTamil",
    fontSize: 9,
    color: "#99f6e4", // teal-200
  },
  // Section
  sectionTitle: {
    fontFamily: "NotoSansTamil",
    fontWeight: "bold",
    fontSize: 11,
    color: "#0f766e",
    marginTop: 18,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomColor: "#0f766e",
    borderBottomWidth: 1,
  },
  // Metric Grid
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: 100,
    padding: 8,
    backgroundColor: "#f0fdfa",
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#0f766e",
  },
  metricLabel: {
    fontFamily: "NotoSansTamil",
    fontSize: 7.5,
    color: "#6b7280",
    marginBottom: 2,
  },
  metricValue: {
    fontFamily: "NotoSansTamil",
    fontWeight: "bold",
    fontSize: 12,
    color: "#134e4a",
  },
  metricValueSmall: {
    fontFamily: "NotoSansTamil",
    fontWeight: "bold",
    fontSize: 9,
    color: "#134e4a",
  },
  // Table
  table: {
    borderWidth: 1,
    borderColor: "#d1fae5",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#ccfbf1",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontFamily: "NotoSansTamil",
    fontWeight: "bold",
    fontSize: 7.5,
    color: "#0f766e",
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#d1fae5",
  },
  tableRowAlt: {
    backgroundColor: "#f0fdfa",
  },
  tableCell: {
    fontFamily: "NotoSansTamil",
    fontSize: 8,
    color: "#374151",
    flex: 1,
    paddingRight: 2,
  },
  tableCellBold: {
    fontFamily: "NotoSansTamil",
    fontWeight: "bold",
    fontSize: 8,
    color: "#134e4a",
    flex: 1,
  },
  tableCellGreen: {
    fontFamily: "NotoSansTamil",
    fontSize: 8,
    color: "#059669",
    flex: 1,
  },
  tableCellRed: {
    fontFamily: "NotoSansTamil",
    fontSize: 8,
    color: "#dc2626",
    flex: 1,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#d1d5db",
    paddingTop: 6,
  },
  footerText: {
    fontFamily: "NotoSansTamil",
    fontSize: 7,
    color: "#9ca3af",
  },
  // Bilingual label pair
  bilingualLabel: {
    fontFamily: "NotoSansTamil",
    fontSize: 7.5,
    color: "#6b7280",
  },
  pill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  pillText: {
    fontFamily: "NotoSansTamil",
    fontSize: 7,
    fontWeight: "bold",
  },
});

// ─── Bilingual helper ─────────────────────────────────────────────────────────

function bi(ta: string, en: string, lang: "ta" | "en"): string {
  return lang === "ta" ? ta : en;
}

// ─── Main PDF Document Component ─────────────────────────────────────────────

interface TripReportDocumentProps {
  data: TripReportPayload;
  lang: "ta" | "en";
}

export function TripReportDocument({ data, lang }: TripReportDocumentProps) {
  const { trip, expenses, settlements, memberBalances, generatedAt } = data;

  const memberName = (id: string): string =>
    trip.members.find((m) => m.memberId === id)?.name ?? id;

  const genDate = new Date(generatedAt);
  const genDateStr = genDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Category-wise totals
  const categoryTotals: Partial<Record<ExpenseCategory, number>> = {};
  expenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amountPaise;
  });

  return (
    <Document
      title={`${trip.name} — ${bi("பயண அறிக்கை", "Trip Report", lang)}`}
      author="Vazhithunai (வழித்துணை)"
      subject={`${bi("பயண தணிக்கை அறிக்கை", "Trip Audit Report", lang)} — ${trip.destination}`}
      creator="Vazhithunai PDF Engine v1.0"
      language={lang === "ta" ? "ta-IN" : "en-IN"}
    >
      {/* ════ PAGE 1: Summary + Expenses ════ */}
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerBand} fixed>
          <Text style={s.headerTitle}>
            வழித்துணை · Vazhithunai
          </Text>
          <Text style={s.headerSubtitle}>
            {bi("பயண தணிக்கை அறிக்கை", "Trip Audit Report", lang)} — {trip.name}
          </Text>
        </View>

        {/* ── Trip Summary ── */}
        <Text style={s.sectionTitle}>
          {bi("1. பயண சுருக்கம்", "1. Trip Summary", lang)}
        </Text>

        <View style={s.metricRow}>
          <View style={s.metricCard}>
            <Text style={s.metricLabel}>
              {bi("பயணப் பெயர்", "Trip Name", lang)}
            </Text>
            <Text style={s.metricValueSmall}>{trip.name}</Text>
          </View>

          <View style={s.metricCard}>
            <Text style={s.metricLabel}>
              {bi("சேருமிடம்", "Destination", lang)}
            </Text>
            <Text style={s.metricValueSmall}>{trip.destination}</Text>
          </View>

          <View style={s.metricCard}>
            <Text style={s.metricLabel}>
              {bi("தேதிகள்", "Dates", lang)}
            </Text>
            <Text style={s.metricValueSmall}>
              {trip.startDate} → {trip.endDate}
            </Text>
          </View>
        </View>

        <View style={s.metricRow}>
          <View style={s.metricCard}>
            <Text style={s.metricLabel}>
              {bi("மொத்த செலவு", "Total Expense", lang)}
            </Text>
            <Text style={s.metricValue}>
              {formatPaise(trip.totalExpensePaise)}
            </Text>
          </View>

          <View style={s.metricCard}>
            <Text style={s.metricLabel}>
              {bi("உறுப்பினர்கள்", "Members", lang)}
            </Text>
            <Text style={s.metricValue}>{trip.members.length}</Text>
          </View>

          <View style={s.metricCard}>
            <Text style={s.metricLabel}>
              {bi("ஒருவருக்கு சராசரி", "Avg Per Member", lang)}
            </Text>
            <Text style={s.metricValue}>
              {trip.members.length > 0
                ? formatPaise(Math.round(trip.totalExpensePaise / trip.members.length))
                : "₹0.00"}
            </Text>
          </View>

          <View style={s.metricCard}>
            <Text style={s.metricLabel}>
              {bi("மொத்த செலவுகள்", "Total Expenses", lang)}
            </Text>
            <Text style={s.metricValue}>{expenses.length}</Text>
          </View>
        </View>

        {/* Route metrics if available */}
        {trip.estimatedDistanceMeters && trip.estimatedDistanceMeters > 0 && (
          <View style={s.metricRow}>
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>
                {bi("மதிப்பிடப்பட்ட தூரம்", "Est. Distance", lang)}
              </Text>
              <Text style={s.metricValueSmall}>
                {Math.round(trip.estimatedDistanceMeters / 1000)} km
              </Text>
            </View>
            {trip.estimatedFuelCostPaise !== undefined && (
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>
                  {bi("எரிபொருள் செலவு", "Est. Fuel Cost", lang)}
                </Text>
                <Text style={s.metricValueSmall}>
                  {formatPaise(trip.estimatedFuelCostPaise)}
                </Text>
              </View>
            )}
            {trip.estimatedTollCostPaise !== undefined && (
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>
                  {bi("டோல் கட்டணம்", "Est. Toll Cost", lang)}
                </Text>
                <Text style={s.metricValueSmall}>
                  {formatPaise(trip.estimatedTollCostPaise)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Category-Wise Breakdown ── */}
        <Text style={s.sectionTitle}>
          {bi("2. வகையின்படி செலவு", "2. Expenses by Category", lang)}
        </Text>

        <View style={s.table}>
          <View style={s.tableHeaderRow}>
            <Text style={[s.tableHeaderCell, { flex: 2 }]}>
              {bi("வகை", "Category", lang)}
            </Text>
            <Text style={s.tableHeaderCell}>
              {bi("தொகை", "Amount", lang)}
            </Text>
            <Text style={s.tableHeaderCell}>
              {bi("சதவீதம்", "% of Total", lang)}
            </Text>
          </View>
          {(Object.entries(categoryTotals) as [ExpenseCategory, number][])
            .sort(([, a], [, b]) => b - a)
            .map(([cat, total], i) => (
              <View
                key={cat}
                style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
              >
                <Text style={[s.tableCell, { flex: 2 }]}>
                  {lang === "ta" ? CATEGORY_LABELS_TA[cat] : CATEGORY_LABELS_EN[cat]}
                </Text>
                <Text style={s.tableCellBold}>{formatPaise(total)}</Text>
                <Text style={s.tableCell}>
                  {trip.totalExpensePaise > 0
                    ? ((total / trip.totalExpensePaise) * 100).toFixed(1) + "%"
                    : "0%"}
                </Text>
              </View>
            ))}
        </View>

        {/* ── Expense Ledger ── */}
        <Text style={s.sectionTitle}>
          {bi("3. முழு செலவு பேரேடு", "3. Full Expense Ledger", lang)}
        </Text>

        <View style={s.table}>
          <View style={s.tableHeaderRow}>
            <Text style={[s.tableHeaderCell, { flex: 3 }]}>
              {bi("விவரம்", "Description", lang)}
            </Text>
            <Text style={s.tableHeaderCell}>
              {bi("வகை", "Category", lang)}
            </Text>
            <Text style={s.tableHeaderCell}>
              {bi("செலுத்தியவர்", "Paid By", lang)}
            </Text>
            <Text style={s.tableHeaderCell}>
              {bi("தொகை", "Amount", lang)}
            </Text>
          </View>
          {expenses.map((expense, i) => (
            <View
              key={expense.expenseId}
              style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
              wrap={false}
            >
              <Text style={[s.tableCell, { flex: 3 }]} numberOfLines={2}>
                {expense.description || "—"}
              </Text>
              <Text style={s.tableCell}>
                {lang === "ta"
                  ? CATEGORY_LABELS_TA[expense.category]
                  : CATEGORY_LABELS_EN[expense.category]}
              </Text>
              <Text style={s.tableCell} numberOfLines={1}>
                {memberName(expense.paidBy)}
              </Text>
              <Text style={s.tableCellBold}>
                {formatPaise(expense.amountPaise)}
              </Text>
            </View>
          ))}
          {/* Total Row */}
          <View
            style={[
              s.tableRow,
              { backgroundColor: "#ccfbf1", borderTopWidth: 1.5, borderTopColor: "#0f766e" },
            ]}
          >
            <Text style={[s.tableCellBold, { flex: 3 }]}>
              {bi("மொத்தம்", "Total", lang)}
            </Text>
            <Text style={s.tableCell}></Text>
            <Text style={s.tableCell}></Text>
            <Text style={s.tableCellBold}>{formatPaise(trip.totalExpensePaise)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            வழித்துணை · Vazhithunai — {bi("பயண அறிக்கை", "Trip Report", lang)}
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `${bi("பக்கம்", "Page", lang)} ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* ════ PAGE 2: Member Balances + Settlements ════ */}
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerBand} fixed>
          <Text style={s.headerTitle}>
            வழித்துணை · Vazhithunai
          </Text>
          <Text style={s.headerSubtitle}>
            {trip.name} — {bi("இருப்பு நிலை & தீர்வு", "Balances & Settlements", lang)}
          </Text>
        </View>

        {/* ── Member Net Balance Table ── */}
        <Text style={s.sectionTitle}>
          {bi("4. உறுப்பினர் நிகர இருப்பு", "4. Member Net Balances", lang)}
        </Text>

        <View style={s.table}>
          <View style={s.tableHeaderRow}>
            <Text style={[s.tableHeaderCell, { flex: 2 }]}>
              {bi("பெயர்", "Name", lang)}
            </Text>
            <Text style={s.tableHeaderCell}>
              {bi("செலுத்தியது", "Total Paid", lang)}
            </Text>
            <Text style={s.tableHeaderCell}>
              {bi("பங்கு", "Total Share", lang)}
            </Text>
            <Text style={s.tableHeaderCell}>
              {bi("நிகர இருப்பு", "Net Balance", lang)}
            </Text>
            <Text style={s.tableHeaderCell}>
              {bi("நிலை", "Status", lang)}
            </Text>
          </View>
          {memberBalances.map((mb, i) => (
            <View
              key={mb.memberId}
              style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
              wrap={false}
            >
              <Text style={[s.tableCellBold, { flex: 2 }]} numberOfLines={1}>
                {mb.name}
              </Text>
              <Text style={s.tableCell}>
                {formatPaise(mb.totalPaidPaise)}
              </Text>
              <Text style={s.tableCell}>
                {formatPaise(mb.totalSharePaise)}
              </Text>
              <Text
                style={
                  mb.netBalancePaise > 0
                    ? s.tableCellGreen
                    : mb.netBalancePaise < 0
                    ? s.tableCellRed
                    : s.tableCell
                }
              >
                {mb.netBalancePaise >= 0 ? "+" : ""}
                {formatPaise(mb.netBalancePaise)}
              </Text>
              <Text style={s.tableCell}>
                {mb.netBalancePaise > 0
                  ? bi("கடன் வரவு", "Creditor", lang)
                  : mb.netBalancePaise < 0
                  ? bi("கடன்படுவோர்", "Debtor", lang)
                  : bi("சமன்", "Settled", lang)}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Settlement Transactions ── */}
        <Text style={s.sectionTitle}>
          {bi("5. தீர்வு பரிவர்த்தனைகள்", "5. Settlement Transactions", lang)}
        </Text>

        {settlements.length === 0 ? (
          <Text style={{ ...s.tableCell, marginBottom: 12 }}>
            {bi("தீர்வு பரிவர்த்தனைகள் இல்லை", "No settlement transactions found.", lang)}
          </Text>
        ) : (
          <View style={s.table}>
            <View style={s.tableHeaderRow}>
              <Text style={[s.tableHeaderCell, { flex: 2 }]}>
                {bi("செலுத்துவோர்", "From (Debtor)", lang)}
              </Text>
              <Text style={[s.tableHeaderCell, { flex: 2 }]}>
                {bi("பெறுவோர்", "To (Creditor)", lang)}
              </Text>
              <Text style={s.tableHeaderCell}>
                {bi("தொகை", "Amount", lang)}
              </Text>
              <Text style={s.tableHeaderCell}>
                {bi("நிலை", "Status", lang)}
              </Text>
            </View>
            {settlements.map((sett, i) => (
              <View
                key={sett.settlementId}
                style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
                wrap={false}
              >
                <Text style={[s.tableCell, { flex: 2 }]} numberOfLines={1}>
                  {memberName(sett.fromMemberId)}
                </Text>
                <Text style={[s.tableCell, { flex: 2 }]} numberOfLines={1}>
                  {memberName(sett.toMemberId)}
                </Text>
                <Text style={s.tableCellBold}>
                  {formatPaise(sett.amountPaise)}
                </Text>
                <Text
                  style={
                    sett.status === "settled"
                      ? s.tableCellGreen
                      : sett.status === "disputed"
                      ? s.tableCellRed
                      : s.tableCell
                  }
                >
                  {lang === "ta" ? STATUS_TA[sett.status] : STATUS_EN[sett.status]}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Members Roster ── */}
        <Text style={s.sectionTitle}>
          {bi("6. உறுப்பினர் விவரங்கள்", "6. Member Details", lang)}
        </Text>

        <View style={s.table}>
          <View style={s.tableHeaderRow}>
            <Text style={[s.tableHeaderCell, { flex: 2 }]}>
              {bi("பெயர்", "Name", lang)}
            </Text>
            <Text style={[s.tableHeaderCell, { flex: 2 }]}>
              {bi("தொலைபேசி", "Phone", lang)}
            </Text>
            <Text style={s.tableHeaderCell}>
              {bi("UPI ID", "UPI ID", lang)}
            </Text>
          </View>
          {trip.members.map((member, i) => (
            <View
              key={member.memberId}
              style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
              wrap={false}
            >
              <Text style={[s.tableCellBold, { flex: 2 }]} numberOfLines={1}>
                {member.name}
              </Text>
              <Text style={[s.tableCell, { flex: 2 }]}>
                {member.phone || "—"}
              </Text>
              <Text style={s.tableCell}>
                {member.upiId || "—"}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Audit Footer ── */}
        <View
          style={{
            marginTop: 20,
            padding: 10,
            backgroundColor: "#f0fdfa",
            borderRadius: 4,
            borderLeftWidth: 3,
            borderLeftColor: "#0f766e",
          }}
        >
          <Text
            style={{
              fontFamily: "NotoSansTamil",
              fontSize: 8,
              color: "#0f766e",
              fontWeight: "bold",
              marginBottom: 3,
            }}
          >
            {bi(
              "சட்டப்பூர்வ குறிப்பு",
              "Legal Disclaimer",
              lang
            )}
          </Text>
          <Text style={{ ...s.tableCell, color: "#6b7280", flex: 0 }}>
            {bi(
              "இந்த அறிக்கை வழித்துணை பயன்பாட்டால் தானாக உருவாக்கப்பட்டது. இது தணிக்கை நோக்கங்களுக்காக மட்டுமே. தனிப்பட்ட சரிபார்ப்பை மேற்கொள்ளுங்கள்.",
              "This report was automatically generated by Vazhithunai. It is intended for reference and audit purposes only. Verify all figures independently.",
              lang
            )}
          </Text>
          <Text style={{ ...s.bilingualLabel, marginTop: 6 }}>
            {bi("உருவாக்கப்பட்ட நேரம்:", "Generated on:", lang)} {genDateStr}
          </Text>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            வழித்துணை · Vazhithunai — {bi("பயண அறிக்கை", "Trip Report", lang)}
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `${bi("பக்கம்", "Page", lang)} ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
