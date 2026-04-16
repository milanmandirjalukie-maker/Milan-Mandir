import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const FAMILY_RELATIONS = [
  "Father",
  "Mother",
  "Son",
  "Daughter",
  "Daughter-in-law",
  "Grandson",
  "Granddaughter",
  "Brother",
  "Sister",
];

export const ADDRESS_FIELD_KEYS = [
  "houseNo",
  "location",
  "villageTown",
  "district",
  "state",
  "pinCode",
];

const config = window.SUPABASE_CONFIG;

if (
  !config?.url ||
  !config?.publishableKey ||
  config.publishableKey.includes("PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE")
) {
  throw new Error(
    "Missing Supabase config. Create supabase-config.js from supabase-config.example.js first."
  );
}

export const supabase = createClient(config.url, config.publishableKey);
export const supabaseUrl = config.url;
export const supabasePublishableKey = config.publishableKey;
export const monthlyCollectionDefault = Number(config.monthlyCollectionDefault || 200);
export const storageBucket = config.storageBucket || "member-documents";

export function setTodayDateText(elementId) {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }

  element.textContent = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
  }).format(new Date());
}

export function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export function getMonthStartIso(monthKey = getCurrentMonthKey()) {
  return `${monthKey}-01`;
}

export function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatAadhaarNumber(value) {
  const digits = `${value || ""}`.replace(/\D/g, "").slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, "$1-");
}

export function normalizeAddressFields(addressFields = {}) {
  return ADDRESS_FIELD_KEYS.reduce((accumulator, key) => {
    accumulator[key] = `${addressFields[key] || ""}`.trim();
    return accumulator;
  }, {});
}

export function formatAddress(addressFields = {}) {
  return ADDRESS_FIELD_KEYS.map((key) => addressFields[key]).filter(Boolean).join(", ");
}

export function normalizeFamilyMembers(rows = []) {
  return (rows || [])
    .map((row) => ({
      name: `${row?.name || ""}`.trim(),
      relation: `${row?.relation || ""}`.trim(),
    }))
    .filter((row) => row.name || row.relation);
}

export function formatFamilyDetails(rows = []) {
  const normalized = normalizeFamilyMembers(rows);
  if (!normalized.length) {
    return "No family details added.";
  }

  return normalized.map((row) => `${row.name} (${row.relation || "Relation not set"})`).join(", ");
}

export function getAddressFieldsFromForm(prefix) {
  return normalizeAddressFields({
    houseNo: document.getElementById(`${prefix}HouseNo`).value,
    location: document.getElementById(`${prefix}Location`).value,
    villageTown: document.getElementById(`${prefix}VillageTown`).value,
    district: document.getElementById(`${prefix}District`).value,
    state: document.getElementById(`${prefix}State`).value,
    pinCode: document.getElementById(`${prefix}PinCode`).value,
  });
}

export function setAddressFieldsToForm(prefix, addressFields = {}) {
  const normalized = normalizeAddressFields(addressFields);
  ADDRESS_FIELD_KEYS.forEach((key) => {
    const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
    const element = document.getElementById(`${prefix}${pascalKey}`);
    if (element) {
      element.value = normalized[key] || "";
    }
  });
}

export function generateMemberCode(phone, registrationDate = getTodayIso()) {
  const cleanPhone = `${phone || ""}`.replace(/\D/g, "");
  const lastFourDigits = cleanPhone.slice(-4).padStart(4, "0");
  const year = `${registrationDate || getTodayIso()}`.slice(0, 4);
  return `MMJ/${year}/${lastFourDigits}`;
}

export async function generateUniqueMemberCode(phone, registrationDate = getTodayIso()) {
  const baseCode = generateMemberCode(phone, registrationDate);
  const { data, error } = await supabase.from("members").select("member_code");
  if (error) {
    throw new Error(`Could not generate member code: ${error.message}`);
  }

  const existingCodes = new Set((data || []).map((row) => row.member_code));
  if (!existingCodes.has(baseCode)) {
    return baseCode;
  }

  let suffix = 2;
  while (existingCodes.has(`${baseCode}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseCode}-${suffix}`;
}

export function escapeHtml(value) {
  return `${value || ""}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escapeAttribute(value) {
  return escapeHtml(value);
}

export function writePopupMessage(popup, message) {
  if (!popup) {
    return;
  }

  popup.document.open();
  popup.document.write(
    `<!DOCTYPE html><html><head><title>MILAN MANDIR</title></head><body style="font-family: Arial, sans-serif; padding: 24px;">${escapeHtml(
      message
    )}</body></html>`
  );
  popup.document.close();
}

export function renderPopupDocument(popup, url, label) {
  if (!popup) {
    return;
  }

  const isPdf = /\.pdf($|\?)/i.test(url);
  const body = isPdf
    ? `<embed src="${escapeAttribute(url)}" type="application/pdf" style="width:100%;height:92vh;border:none;" />`
    : `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(
        label
      )}" style="max-width:100%;height:auto;display:block;margin:0 auto;" />`;

  popup.document.open();
  popup.document.write(
    `<!DOCTYPE html><html><head><title>${escapeHtml(
      label
    )}</title><style>body{margin:0;padding:16px;background:#f5f5f5;font-family:Arial,sans-serif;}a{display:inline-block;margin-bottom:12px;}</style></head><body><a href="${escapeAttribute(
      url
    )}" target="_blank" rel="noopener">Open file directly</a>${body}</body></html>`
  );
  popup.document.close();
}

export function openPopup(label) {
  const popup = window.open("", "_blank");
  if (!popup) {
    throw new Error(`Please allow popups to view ${label}.`);
  }
  return popup;
}
