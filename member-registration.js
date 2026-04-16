const STORAGE_KEY = "milan-mandir-management-v1";
const SESSION_KEY = "milan-mandir-session-v1";
const FAMILY_RELATIONS = [
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
const ADDRESS_FIELD_KEYS = [
  "houseNo",
  "location",
  "villageTown",
  "district",
  "state",
  "pinCode",
];

let state = loadState();
let currentMemberId = "";

document.addEventListener("DOMContentLoaded", initMemberRegistrationPage);

function initMemberRegistrationPage() {
  const session = loadSession();

  if (session?.role !== "admin") {
    window.location.href = "./index.html";
    return;
  }

  document.getElementById("registrationDateLabel").textContent = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
  }).format(new Date());

  const params = new URLSearchParams(window.location.search);
  currentMemberId = params.get("memberId") || "";

  bindFormEvents();
  renderFamilyMemberRows();
  updateUploadStatus("memberPhotoStatus");
  updateUploadStatus("memberAadhaarStatus");

  if (currentMemberId) {
    loadMemberForEdit(currentMemberId);
  } else {
    prepareNewMemberForm();
  }
}

function bindFormEvents() {
  document
    .getElementById("memberRegistrationForm")
    .addEventListener("submit", handleMemberSave);
  document
    .getElementById("memberResetBtn")
    .addEventListener("click", handleMemberReset);
  document
    .getElementById("addFamilyMemberBtn")
    .addEventListener("click", () => addFamilyMemberRow());
  document.getElementById("memberAadhaarNumber").addEventListener("input", (event) => {
    event.target.value = formatAadhaarNumber(event.target.value);
  });
  document.getElementById("memberPhoto").addEventListener("change", (event) => {
    const file = event.target.files[0];
    updateUploadStatus("memberPhotoStatus", file ? "#" : "", file?.name || "");
  });
  document.getElementById("memberAadhaarCard").addEventListener("change", (event) => {
    const file = event.target.files[0];
    updateUploadStatus("memberAadhaarStatus", file ? "#" : "", file?.name || "");
  });
}

async function handleMemberSave(event) {
  event.preventDefault();

  const existingMember = state.members.find((member) => member.id === currentMemberId) || {};
  const memberPhotoFile = document.getElementById("memberPhoto").files[0];
  const aadharCardFile = document.getElementById("memberAadhaarCard").files[0];
  const memberPhoto = memberPhotoFile
    ? await readFileAsDataUrl(memberPhotoFile)
    : {
        data: existingMember.memberPhotoData || "",
        name: existingMember.memberPhotoName || "",
        type: existingMember.memberPhotoType || "",
      };
  const aadharCard = aadharCardFile
    ? await readFileAsDataUrl(aadharCardFile)
    : {
        data: existingMember.aadharCardData || "",
        name: existingMember.aadharCardName || "",
        type: existingMember.aadharCardType || "",
      };

  const payload = buildMemberPayload(currentMemberId || createId(), existingMember, memberPhoto, aadharCard);
  upsertMember(payload);
  window.location.href = "./index.html?tab=members";
}

function handleMemberReset() {
  if (currentMemberId) {
    loadMemberForEdit(currentMemberId);
    setMemberFormNotice("Form reset to the saved member details.");
    return;
  }

  prepareNewMemberForm();
  setMemberFormNotice("Form cleared. You can enter new member details.");
}

function buildMemberPayload(id, existingMember, memberPhoto, aadharCard) {
  const registrationDate = existingMember.createdAt || new Date().toISOString();
  const presentAddressFields = getAddressFieldsFromForm("memberPresent");
  const permanentAddressFields = getAddressFieldsFromForm("memberPermanent");

  return {
    id,
    memberCode:
      existingMember.memberCode ||
      generateMemberCode(document.getElementById("memberPhone").value.trim(), registrationDate),
    name: document.getElementById("memberName").value.trim(),
    gender: document.getElementById("memberGender").value,
    phone: document.getElementById("memberPhone").value.trim(),
    email: document.getElementById("memberEmail").value.trim(),
    occupation: document.getElementById("memberOccupation").value.trim(),
    dob: document.getElementById("memberDob").value,
    aadharNumber: formatAadhaarNumber(document.getElementById("memberAadhaarNumber").value),
    presentAddressFields,
    presentAddress: formatAddressFields(presentAddressFields),
    permanentAddressFields,
    permanentAddress: formatAddressFields(permanentAddressFields),
    familyMembers: collectFamilyMembers(),
    memberPhotoData: memberPhoto.data,
    memberPhotoName: memberPhoto.name,
    memberPhotoType: memberPhoto.type,
    aadharCardData: aadharCard.data,
    aadharCardName: aadharCard.name,
    aadharCardType: aadharCard.type,
    createdAt: registrationDate,
  };
}

function upsertMember(payload) {
  const members = state.members.slice();
  const index = members.findIndex((member) => member.id === payload.id);

  if (index >= 0) {
    members[index] = payload;
  } else {
    members.unshift(payload);
  }

  const nextState = {
    ...state,
    members,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function loadMemberForEdit(memberId) {
  const member = state.members.find((item) => item.id === memberId);

  if (!member) {
    prepareNewMemberForm();
    setMemberFormNotice("Member not found. You can register a new member instead.");
    return;
  }

  const normalizedMember = normalizeMemberRecord(member);
  document.getElementById("registrationHeroTitle").textContent = "Edit Member";
  document.getElementById("registrationHeroLead").textContent =
    "Update the member record and save the changes from this page.";
  document.getElementById("memberFormTitle").textContent = `Edit Member: ${normalizedMember.name}`;
  document.getElementById("memberSubmitBtn").textContent = "Update Member";
  document.getElementById("memberId").value = normalizedMember.id;
  document.getElementById("memberCode").value = normalizedMember.memberCode || "";
  document.getElementById("memberName").value = normalizedMember.name || "";
  document.getElementById("memberGender").value = normalizedMember.gender || "";
  document.getElementById("memberPhone").value = normalizedMember.phone || "";
  document.getElementById("memberEmail").value = normalizedMember.email || "";
  document.getElementById("memberOccupation").value = normalizedMember.occupation || "";
  document.getElementById("memberDob").value = normalizedMember.dob || "";
  document.getElementById("memberAadhaarNumber").value = normalizedMember.aadharNumber || "";
  setAddressFieldsToForm("memberPresent", normalizedMember.presentAddressFields || {});
  setAddressFieldsToForm("memberPermanent", normalizedMember.permanentAddressFields || {});
  renderFamilyMemberRows(normalizedMember.familyMembers);
  document.getElementById("memberPhoto").value = "";
  document.getElementById("memberAadhaarCard").value = "";
  updateUploadStatus("memberPhotoStatus", normalizedMember.memberPhotoData, normalizedMember.memberPhotoName);
  updateUploadStatus("memberAadhaarStatus", normalizedMember.aadharCardData, normalizedMember.aadharCardName);
}

function prepareNewMemberForm() {
  currentMemberId = "";
  document.getElementById("registrationHeroTitle").textContent = "Register Member";
  document.getElementById("registrationHeroLead").textContent =
    "Add a new member record from this separate registration page.";
  document.getElementById("memberFormTitle").textContent = "Register Member";
  document.getElementById("memberSubmitBtn").textContent = "Save Member";
  document.getElementById("memberRegistrationForm").reset();
  document.getElementById("memberId").value = "";
  document.getElementById("memberCode").value = "";
  renderFamilyMemberRows();
  updateUploadStatus("memberPhotoStatus");
  updateUploadStatus("memberAadhaarStatus");
}

function renderFamilyMemberRows(rows = []) {
  const container = document.getElementById("familyMembersList");
  const normalizedRows = rows.length ? rows : [{ name: "", relation: "" }];
  container.innerHTML = "";
  normalizedRows.forEach((row) => addFamilyMemberRow(row));
}

function addFamilyMemberRow(row = {}) {
  const container = document.getElementById("familyMembersList");
  const wrapper = document.createElement("div");
  wrapper.className = "family-row";

  const relationOptions = FAMILY_RELATIONS.map(
    (relation) =>
      `<option value="${relation}" ${row.relation === relation ? "selected" : ""}>${relation}</option>`
  ).join("");

  wrapper.innerHTML = `
    <label>
      Family Member Name
      <input class="family-member-name" type="text" value="${row.name || ""}" />
    </label>
    <label>
      Relation
      <select class="family-member-relation">
        <option value="">Select Relation</option>
        ${relationOptions}
      </select>
    </label>
    <button type="button" class="ghost-button ghost-button--small family-remove-btn">
      Remove
    </button>
  `;

  wrapper.querySelector(".family-remove-btn").addEventListener("click", () => {
    wrapper.remove();

    if (!container.children.length) {
      addFamilyMemberRow();
    }
  });

  container.appendChild(wrapper);
}

function collectFamilyMembers() {
  return [...document.querySelectorAll("#familyMembersList .family-row")]
    .map((row) => ({
      id: createId(),
      name: row.querySelector(".family-member-name").value.trim(),
      relation: row.querySelector(".family-member-relation").value,
    }))
    .filter((item) => item.name || item.relation);
}

function getAddressFieldsFromForm(prefix) {
  return {
    houseNo: document.getElementById(`${prefix}HouseNo`).value.trim(),
    location: document.getElementById(`${prefix}Location`).value.trim(),
    villageTown: document.getElementById(`${prefix}VillageTown`).value.trim(),
    district: document.getElementById(`${prefix}District`).value.trim(),
    state: document.getElementById(`${prefix}State`).value.trim(),
    pinCode: document.getElementById(`${prefix}PinCode`).value.trim(),
  };
}

function setAddressFieldsToForm(prefix, addressFields) {
  const fields = normalizeAddressFields(addressFields);
  document.getElementById(`${prefix}HouseNo`).value = fields.houseNo;
  document.getElementById(`${prefix}Location`).value = fields.location;
  document.getElementById(`${prefix}VillageTown`).value = fields.villageTown;
  document.getElementById(`${prefix}District`).value = fields.district;
  document.getElementById(`${prefix}State`).value = fields.state;
  document.getElementById(`${prefix}PinCode`).value = fields.pinCode;
}

function normalizeAddressFields(addressFields, fallbackText = "") {
  const safeFields = Object.fromEntries(
    ADDRESS_FIELD_KEYS.map((key) => [key, addressFields?.[key] || ""])
  );

  if (safeFields.location || !fallbackText) {
    return safeFields;
  }

  return {
    ...safeFields,
    location: fallbackText,
  };
}

function formatAddressFields(addressFields) {
  return ADDRESS_FIELD_KEYS.map((key) => addressFields?.[key] || "")
    .filter(Boolean)
    .join(", ");
}

function normalizeMemberRecord(member) {
  const createdAt = member.createdAt || new Date().toISOString();
  const normalizedPhone = member.phone || "";

  return {
    ...member,
    createdAt,
    memberCode: member.memberCode || generateMemberCode(normalizedPhone, createdAt),
    dob: member.dob || member.joinedOn || "",
    aadharNumber: member.aadharNumber || "",
    presentAddressFields: normalizeAddressFields(
      member.presentAddressFields,
      member.presentAddress || member.address || ""
    ),
    presentAddress: formatAddressFields(
      normalizeAddressFields(member.presentAddressFields, member.presentAddress || member.address || "")
    ),
    permanentAddressFields: normalizeAddressFields(
      member.permanentAddressFields,
      member.permanentAddress || ""
    ),
    permanentAddress: formatAddressFields(
      normalizeAddressFields(member.permanentAddressFields, member.permanentAddress || "")
    ),
    familyMembers: Array.isArray(member.familyMembers)
      ? member.familyMembers
          .map((item) => ({
            id: item.id || createId(),
            name: item.name || "",
            relation: item.relation || "",
          }))
          .filter((item) => item.name || item.relation)
      : [],
    memberPhotoData: member.memberPhotoData || "",
    memberPhotoName: member.memberPhotoName || "",
    memberPhotoType: member.memberPhotoType || "",
    aadharCardData: member.aadharCardData || "",
    aadharCardName: member.aadharCardName || "",
    aadharCardType: member.aadharCardType || "",
  };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return {
      members: [],
    };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      ...parsed,
      members: (parsed.members || []).map(normalizeMemberRecord),
    };
  } catch (error) {
    console.error("Failed to parse stored data.", error);
    return {
      members: [],
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

function setMemberFormNotice(message) {
  document.getElementById("memberFormNotice").textContent = message;
}

function updateUploadStatus(elementId, data = "", fileName = "") {
  const target = document.getElementById(elementId);

  if (!fileName) {
    target.textContent = "No file selected";
    return;
  }

  if (!data || data === "#") {
    target.textContent = `Selected file: ${fileName}`;
    return;
  }

  target.innerHTML = `Current file: <a href="${data}" target="_blank" rel="noopener noreferrer">${fileName}</a>`;
}

function formatAadhaarNumber(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 12);
  const parts = digits.match(/.{1,4}/g) || [];
  return parts.join("-");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        data: reader.result,
        name: file.name,
        type: file.type,
      });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function createId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function generateMemberCode(phone, registrationDate) {
  const year = new Date(registrationDate).getFullYear();
  const digits = String(phone || "").replace(/\D/g, "");
  const lastFourDigits = digits.slice(-4).padStart(4, "0");
  return `MMJ/${year}/${lastFourDigits}`;
}
