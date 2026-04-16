const STORAGE_KEY = "milan-mandir-management-v1";
const SESSION_KEY = "milan-mandir-session-v1";

document.addEventListener("DOMContentLoaded", initDetailPage);

function initDetailPage() {
  const session = loadSession();

  if (session?.role !== "admin") {
    window.location.href = "./index.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const monthKey = params.get("month") || "";
  const type = params.get("type") || "";

  if (!/^\d{4}-\d{2}$/.test(monthKey) || !["collections", "donations"].includes(type)) {
    renderInvalidState();
    return;
  }

  const state = loadState();
  const records = getDetailRecords(state, monthKey, type);
  const monthLabel = formatMonth(monthKey);
  const isCollectionView = type === "collections";

  document.getElementById("detailDateLabel").textContent = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
  }).format(new Date());

  document.getElementById("detailPageHeading").textContent = isCollectionView
    ? `Collection Details for ${monthLabel}`
    : `Donation Details for ${monthLabel}`;
  document.getElementById("detailPageLead").textContent = isCollectionView
    ? `This page shows all paid monthly collection records for ${monthLabel}.`
    : `This page shows all donation records received in ${monthLabel}.`;
  document.getElementById("detailCardTitle").textContent = isCollectionView
    ? "Monthly Collection Records"
    : "Monthly Donation Records";
  document.getElementById("detailExportTitle").textContent = isCollectionView
    ? "Download Collection Detail"
    : "Download Donation Detail";
  document.getElementById("detailCountMeta").textContent = `${records.length} record(s)`;
  document.getElementById("detailMetaText").textContent = isCollectionView
    ? `Showing paid collection entries for ${monthLabel}.`
    : `Showing donation entries received in ${monthLabel}.`;

  bindExportButtons(records, monthKey, type, state);
  renderRecordList(records, type, state, monthLabel);
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

function bindExportButtons(records, monthKey, type, state) {
  const csvButton = document.getElementById("detailCsvBtn");
  const excelButton = document.getElementById("detailExcelBtn");

  if (!records.length) {
    csvButton.classList.add("is-hidden");
    excelButton.classList.add("is-hidden");
    return;
  }

  const rows = buildExportRows(records, type, state);
  const fileBaseName =
    type === "collections"
      ? `milan-mandir-${monthKey}-collections-detail`
      : `milan-mandir-${monthKey}-donations-detail`;

  csvButton.addEventListener("click", () => exportRows("csv", fileBaseName, rows));
  excelButton.addEventListener("click", () => exportRows("excel", fileBaseName, rows));
}

function renderRecordList(records, type, state, monthLabel) {
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
                <strong>${resolveMemberName(state, item.memberId)}</strong>
                <span class="tag tag--success">${formatCurrency(item.amount)}</span>
              </div>
              <div class="record-tags">
                <span class="tag">${formatMonth(item.month)}</span>
                <span class="tag">${item.status}</span>
                <span class="tag">Paid on ${formatDate(item.paymentDate)}</span>
              </div>
              <div class="record-meta">${item.remarks || "No remarks added."}</div>
            </article>
          `
        : `
            <article class="record-item">
              <div class="record-title">
                <strong>${item.donorName}</strong>
                <span class="tag tag--success">${formatCurrency(item.amount)}</span>
              </div>
              <div class="record-tags">
                <span class="tag">${formatDate(item.donationDate)}</span>
                ${item.donorPhone ? `<span class="tag">${item.donorPhone}</span>` : ""}
                ${item.purpose ? `<span class="tag">${item.purpose}</span>` : ""}
              </div>
              <div class="record-meta">${item.notes || "No notes added."}</div>
            </article>
          `
    )
    .join("");
}

function getDetailRecords(state, monthKey, type) {
  if (type === "collections") {
    return state.collections
      .filter((item) => item.month === monthKey && item.status === "Paid")
      .slice()
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
  }

  return state.donations
    .filter((item) => (item.donationDate || "").slice(0, 7) === monthKey)
    .slice()
    .sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate));
}

function buildExportRows(records, type, state) {
  if (type === "collections") {
    return records.map((item) => ({
      Member: resolveMemberName(state, item.memberId),
      Month: formatMonth(item.month),
      Amount: item.amount,
      Status: item.status,
      "Payment Date": item.paymentDate || "",
      Remarks: item.remarks || "",
    }));
  }

  return records.map((item) => ({
    "Donor Name": item.donorName,
    "Contact Number": item.donorPhone || "",
    Amount: item.amount,
    "Donation Date": item.donationDate || "",
    Purpose: item.purpose || "",
    Notes: item.notes || "",
  }));
}

function resolveMemberName(state, memberId) {
  return state.members.find((member) => member.id === memberId)?.name || "Unknown Member";
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
  const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const bodyHtml = rows
    .map(
      (row) =>
        `<tr>${headers
          .map((header) => `<td>${escapeHtml(String(row[header] ?? ""))}</td>`)
          .join("")}</tr>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></body></html>`;
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  const escaped = stringValue.replaceAll('"', '""');
  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return {
      members: [],
      collections: [],
      donations: [],
    };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      members: parsed.members || [],
      collections: parsed.collections || [],
      donations: parsed.donations || [],
    };
  } catch (error) {
    console.error("Failed to parse stored data.", error);
    return {
      members: [],
      collections: [],
      donations: [],
    };
  }
}

function loadSession() {
  const saved = sessionStorage.getItem(SESSION_KEY);

  if (!saved) {
    return null;
  }

  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error("Failed to parse session data.", error);
    return null;
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatMonth(value) {
  const [year, month] = value.split("-");
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(year), Number(month) - 1));
}
