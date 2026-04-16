import {
  supabase,
  setTodayDateText,
  formatCurrency,
  formatDate,
  escapeHtml,
} from "./supabase-common.js";

document.addEventListener("DOMContentLoaded", initDetailPage);

async function initDetailPage() {
  setTodayDateText("detailDateLabel");

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user?.id) {
    window.location.href = "./supabase-index.html";
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    window.location.href = "./supabase-index.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const monthKey = params.get("month") || "";
  const type = params.get("type") || "";

  if (!/^\d{4}-\d{2}$/.test(monthKey) || !["collections", "donations"].includes(type)) {
    renderInvalidState();
    return;
  }

  const [membersResult, recordsResult] = await Promise.all([
    supabase.from("members").select("id, full_name, member_code"),
    type === "collections"
      ? supabase
          .from("collections")
          .select("*")
          .eq("month_key", monthKey)
          .order("payment_date", { ascending: false })
      : supabase
          .from("donations")
          .select("*")
          .gte("donation_date", `${monthKey}-01`)
          .lt("donation_date", `${getNextMonthKey(monthKey)}-01`)
          .order("donation_date", { ascending: false }),
  ]);

  if (membersResult.error || recordsResult.error) {
    renderLoadError(membersResult.error?.message || recordsResult.error?.message || "Could not load records.");
    return;
  }

  const members = membersResult.data || [];
  const records = recordsResult.data || [];
  const monthLabel = formatMonthLabel(monthKey);
  const isCollectionView = type === "collections";

  document.getElementById("detailPageHeading").textContent = isCollectionView
    ? `Collection Details for ${monthLabel}`
    : `Donation Details for ${monthLabel}`;
  document.getElementById("detailPageLead").textContent = isCollectionView
    ? `This page shows all monthly collection records for ${monthLabel}.`
    : `This page shows all donation records received in ${monthLabel}.`;
  document.getElementById("detailCardTitle").textContent = isCollectionView
    ? "Monthly Collection Records"
    : "Monthly Donation Records";
  document.getElementById("detailExportTitle").textContent = isCollectionView
    ? "Download Collection Detail"
    : "Download Donation Detail";
  document.getElementById("detailCountMeta").textContent = `${records.length} record(s)`;
  document.getElementById("detailMetaText").textContent = isCollectionView
    ? `Showing collection entries for ${monthLabel}.`
    : `Showing donation entries received in ${monthLabel}.`;

  bindExportButtons(records, members, monthKey, type);
  renderRecordList(records, members, type, monthLabel);
}

function renderInvalidState() {
  document.getElementById("detailPageHeading").textContent = "Invalid Detail Request";
  document.getElementById("detailPageLead").textContent =
    "The selected month or record type is not valid.";
  document.getElementById("detailCardTitle").textContent = "No Detail Available";
  document.getElementById("detailExportTitle").textContent = "Download";
  document.getElementById("detailCountMeta").textContent = "";
  document.getElementById("detailMetaText").textContent =
    "Please go back to the dashboard and open the detail page again.";
  document.getElementById("detailRecordList").innerHTML =
    '<div class="empty-state">No detail record found for this request.</div>';
  document.getElementById("detailCsvBtn").classList.add("is-hidden");
  document.getElementById("detailExcelBtn").classList.add("is-hidden");
}

function renderLoadError(message) {
  document.getElementById("detailPageHeading").textContent = "Could Not Load Detail";
  document.getElementById("detailPageLead").textContent =
    "The detail page could not be loaded from the live Supabase data.";
  document.getElementById("detailCardTitle").textContent = "Load Error";
  document.getElementById("detailExportTitle").textContent = "Download";
  document.getElementById("detailCountMeta").textContent = "";
  document.getElementById("detailMetaText").textContent = message;
  document.getElementById("detailRecordList").innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
  document.getElementById("detailCsvBtn").classList.add("is-hidden");
  document.getElementById("detailExcelBtn").classList.add("is-hidden");
}

function bindExportButtons(records, members, monthKey, type) {
  const csvButton = document.getElementById("detailCsvBtn");
  const excelButton = document.getElementById("detailExcelBtn");

  if (!records.length) {
    csvButton.classList.add("is-hidden");
    excelButton.classList.add("is-hidden");
    return;
  }

  const rows = buildExportRows(records, members, type);
  const fileBaseName =
    type === "collections"
      ? `milan-mandir-${monthKey}-collections-detail`
      : `milan-mandir-${monthKey}-donations-detail`;

  csvButton.addEventListener("click", () => exportRows("csv", fileBaseName, rows));
  excelButton.addEventListener("click", () => exportRows("excel", fileBaseName, rows));
}

function renderRecordList(records, members, type, monthLabel) {
  const container = document.getElementById("detailRecordList");

  if (!records.length) {
    container.innerHTML = `<div class="empty-state">No ${
      type === "collections" ? "collection" : "donation"
    } records found for ${monthLabel}.</div>`;
    return;
  }

  container.innerHTML = records
    .map((item) =>
      type === "collections"
        ? `
            <article class="record-item">
              <div class="record-title">
                <strong>${escapeHtml(resolveMemberName(members, item.member_id))}</strong>
                <span class="tag ${item.status === "Paid" ? "tag--success" : "tag--warning"}">${escapeHtml(
                    formatCurrency(item.amount)
                  )}</span>
              </div>
              <div class="record-tags">
                <span class="tag">${escapeHtml(item.month_key || "")}</span>
                <span class="tag">${escapeHtml(item.status || "Not set")}</span>
                <span class="tag">Paid on ${escapeHtml(formatDate(item.payment_date))}</span>
              </div>
              <div class="record-meta">${escapeHtml(item.member_code || "")}</div>
              <div class="record-meta">${escapeHtml(item.remarks || "No remarks added.")}</div>
            </article>
          `
        : `
            <article class="record-item">
              <div class="record-title">
                <strong>${escapeHtml(item.donor_name || "Unknown Donor")}</strong>
                <span class="tag tag--success">${escapeHtml(formatCurrency(item.amount))}</span>
              </div>
              <div class="record-tags">
                <span class="tag">${escapeHtml(formatDate(item.donation_date))}</span>
                ${item.donor_phone ? `<span class="tag">${escapeHtml(item.donor_phone)}</span>` : ""}
                ${item.purpose ? `<span class="tag">${escapeHtml(item.purpose)}</span>` : ""}
              </div>
              <div class="record-meta">${escapeHtml(item.notes || "No notes added.")}</div>
            </article>
          `
    )
    .join("");
}

function buildExportRows(records, members, type) {
  if (type === "collections") {
    return records.map((item) => ({
      "Member Name": resolveMemberName(members, item.member_id),
      "Member ID": item.member_code || "",
      Month: item.month_key || "",
      Amount: item.amount ?? "",
      Status: item.status || "",
      "Payment Date": item.payment_date || "",
      Remarks: item.remarks || "",
      "Created At": item.created_at || "",
    }));
  }

  return records.map((item) => ({
    "Donor Name": item.donor_name || "",
    "Contact Number": item.donor_phone || "",
    Amount: item.amount ?? "",
    "Donation Date": item.donation_date || "",
    Purpose: item.purpose || "",
    Notes: item.notes || "",
    "Created At": item.created_at || "",
  }));
}

function resolveMemberName(members, memberId) {
  return members.find((member) => member.id === memberId)?.full_name || "Unknown Member";
}

function exportRows(format, fileBaseName, rows) {
  if (format === "csv") {
    downloadFile(`${fileBaseName}.csv`, "text/csv;charset=utf-8;", buildCsv(rows));
    return;
  }

  downloadFile(
    `${fileBaseName}.xls`,
    "application/vnd.ms-excel;charset=utf-8;",
    buildExcelTable(rows)
  );
}

function downloadFile(fileName, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function buildCsv(rows) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ];

  return csvRows.join("\r\n");
}

function buildExcelTable(rows) {
  if (!rows.length) {
    return "<table><tr><td>No data available</td></tr></table>";
  }

  const headers = Object.keys(rows[0]);
  const thead = `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;
  const tbody = rows
    .map(
      (row) =>
        `<tr>${headers
          .map((header) => `<td>${escapeHtml(row[header] ?? "")}</td>`)
          .join("")}</tr>`
    )
    .join("");

  return `<table border="1"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  const escaped = stringValue.replaceAll('"', '""');
  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function formatMonthLabel(monthKey) {
  const [year, month] = `${monthKey}`.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, (month || 1) - 1, 1));
}

function getNextMonthKey(monthKey) {
  const [year, month] = `${monthKey}`.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1 + 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
