const STORAGE_KEY = "milan-mandir-management-v1";
const SESSION_KEY = "milan-mandir-session-v1";
const todayISO = new Date().toISOString().slice(0, 10);
const currentMonthISO = new Date().toISOString().slice(0, 7);
const DEFAULT_MONTHLY_COLLECTION_AMOUNT = 200;
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
const cloneData = (value) =>
  typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
const createId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

const seedData = {
  members: [
    {
      id: createId(),
      memberCode: "MMJ/2024/1001",
      name: "Ramesh Sharma",
      gender: "Male",
      phone: "7005001001",
      email: "ramesh@example.com",
      occupation: "Shop Owner",
      dob: "1990-01-15",
      aadharNumber: "1111-2222-3333",
      presentAddressFields: {
        houseNo: "H-12",
        location: "High School Colony",
        villageTown: "Jalukie",
        district: "Peren",
        state: "Nagaland",
        pinCode: "797110",
      },
      presentAddress: "Ward No. 3, Jalukie",
      permanentAddressFields: {
        houseNo: "H-12",
        location: "High School Colony",
        villageTown: "Jalukie",
        district: "Peren",
        state: "Nagaland",
        pinCode: "797110",
      },
      permanentAddress: "Jalukie, Dist: Peren, Nagaland",
      familyMembers: [
        { id: createId(), name: "Suresh Sharma", relation: "Father" },
        { id: createId(), name: "Kamla Sharma", relation: "Mother" },
      ],
      memberPhotoData: "",
      memberPhotoName: "",
      memberPhotoType: "",
      aadharCardData: "",
      aadharCardName: "",
      aadharCardType: "",
      createdAt: new Date().toISOString(),
    },
    {
      id: createId(),
      memberCode: "MMJ/2024/1002",
      name: "Sunita Devi",
      gender: "Female",
      phone: "7005001002",
      email: "sunita@example.com",
      occupation: "Teacher",
      dob: "1992-03-20",
      aadharNumber: "4444-5555-6666",
      presentAddressFields: {
        houseNo: "B-7",
        location: "High School Colony",
        villageTown: "Jalukie",
        district: "Peren",
        state: "Nagaland",
        pinCode: "797110",
      },
      presentAddress: "High School Colony, Jalukie",
      permanentAddressFields: {
        houseNo: "B-7",
        location: "Ward No. 3",
        villageTown: "Jalukie",
        district: "Peren",
        state: "Nagaland",
        pinCode: "797110",
      },
      permanentAddress: "Ward No. 3, Jalukie, Nagaland",
      familyMembers: [{ id: createId(), name: "Anita Devi", relation: "Daughter" }],
      memberPhotoData: "",
      memberPhotoName: "",
      memberPhotoType: "",
      aadharCardData: "",
      aadharCardName: "",
      aadharCardType: "",
      createdAt: new Date().toISOString(),
    },
  ],
  memberUpdateRequests: [],
  collections: [],
  donations: [
    {
      id: createId(),
      donorName: "Vishal Traders",
      donorPhone: "7005001099",
      amount: 5000,
      donationDate: todayISO,
      purpose: "Festival decoration support",
      notes: "General public donation",
      createdAt: new Date().toISOString(),
    },
  ],
  events: [
    {
      id: createId(),
      title: "Monthly Satsang",
      eventDate: todayISO,
      venue: "MILAN MANDIR Campus",
      coordinator: "Temple Committee",
      description: "Monthly prayer gathering, bhajan, and community meal.",
      createdAt: new Date().toISOString(),
    },
  ],
  announcements: [
    {
      id: createId(),
      title: "Welcome to the New Management App",
      announcementDate: todayISO,
      category: "General",
      status: "Active",
      message:
        "This system is now ready for member registrations, collections, donations, events, and announcements.",
      createdAt: new Date().toISOString(),
    },
  ],
};

seedData.collections = [
  {
    id: createId(),
    memberId: seedData.members[0].id,
    month: currentMonthISO,
    amount: DEFAULT_MONTHLY_COLLECTION_AMOUNT,
    paymentDate: todayISO,
    status: "Paid",
    remarks: "Paid in cash",
    createdAt: new Date().toISOString(),
  },
  {
    id: createId(),
    memberId: seedData.members[1].id,
    month: currentMonthISO,
    amount: DEFAULT_MONTHLY_COLLECTION_AMOUNT,
    paymentDate: todayISO,
    status: "Pending",
    remarks: "To be collected next visit",
    createdAt: new Date().toISOString(),
  },
];

let state = loadState();
let currentSession = loadSession();
let isMemberUpdateFormVisible = false;

document.addEventListener("DOMContentLoaded", init);

function init() {
  document.getElementById("todayDate").textContent = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
  }).format(new Date());

  bindAuth();
  bindTabs();
  bindForms();
  bindUtilityActions();
  resetAllForms();
  syncAuthView();
}

function bindAuth() {
  const authTabs = [...document.querySelectorAll(".auth-tabs__item")];
  const authPanels = [...document.querySelectorAll(".auth-panel")];

  authTabs.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.authTarget;
      authTabs.forEach((item) => item.classList.toggle("is-active", item === button));
      authPanels.forEach((panel) => panel.classList.toggle("is-active", panel.id === target));
      setAuthMessage("");
    });
  });

  document
    .getElementById("adminLoginForm")
    .addEventListener("submit", handleAdminLogin);
  document
    .getElementById("memberLoginForm")
    .addEventListener("submit", handleMemberLogin);
  document.getElementById("logoutBtn").addEventListener("click", logout);
}

function bindTabs() {
  const tabButtons = [...document.querySelectorAll(".nav-tabs__item")];
  const tabPanels = [...document.querySelectorAll(".tab-panel")];

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.target;
      tabButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      tabPanels.forEach((panel) => panel.classList.toggle("is-active", panel.id === target));
    });
  });
}

function activateTab(target) {
  const tabButtons = [...document.querySelectorAll(".nav-tabs__item")];
  const tabPanels = [...document.querySelectorAll(".tab-panel")];
  tabButtons.forEach((item) => item.classList.toggle("is-active", item.dataset.target === target));
  tabPanels.forEach((panel) => panel.classList.toggle("is-active", panel.id === target));
}

function getActiveTab() {
  return document.querySelector(".nav-tabs__item.is-active")?.dataset.target || "dashboard";
}

function getDefaultTabForCurrentRole() {
  const requestedTab = getRequestedTabFromUrl();

  if (requestedTab) {
    return requestedTab;
  }

  return isAdmin() ? "dashboard" : "announcements";
}

function getRequestedTabFromUrl() {
  const requestedTab = new URLSearchParams(window.location.search).get("tab");
  const allowedTabs = isAdmin()
    ? ["dashboard", "members", "collections", "donations", "events", "announcements"]
    : ["dashboard", "members", "collections", "events", "announcements"];

  return allowedTabs.includes(requestedTab) ? requestedTab : "";
}

function isAdmin() {
  return currentSession?.role === "admin";
}

function isMember() {
  return currentSession?.role === "member";
}

function getCurrentMember() {
  if (!isMember()) {
    return null;
  }

  return state.members.find((member) => member.id === currentSession.memberId) || null;
}

function handleAdminLogin(event) {
  event.preventDefault();
  const username = document.getElementById("adminUsername").value.trim();
  const password = document.getElementById("adminPassword").value;

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    setAuthMessage("Invalid admin username or password.");
    return;
  }

  currentSession = {
    role: "admin",
    name: "Administrator",
  };
  isMemberUpdateFormVisible = false;
  persistSession();
  document.getElementById("adminLoginForm").reset();
  setAuthMessage("");
  syncAuthView();
}

function handleMemberLogin(event) {
  event.preventDefault();
  const memberCode = document.getElementById("memberLoginId").value.trim().toUpperCase();
  const phone = document.getElementById("memberLoginPhone").value.trim();
  const member = state.members.find(
    (item) => item.memberCode.trim().toUpperCase() === memberCode && item.phone.trim() === phone
  );

  if (!member) {
    setAuthMessage("Member login failed. Check the Member ID and registered mobile number.");
    return;
  }

  currentSession = {
    role: "member",
    memberId: member.id,
    name: member.name,
  };
  isMemberUpdateFormVisible = false;
  persistSession();
  document.getElementById("memberLoginForm").reset();
  setAuthMessage("");
  syncAuthView();
}

function logout() {
  currentSession = null;
  isMemberUpdateFormVisible = false;
  persistSession();
  document.getElementById("memberSearch").value = "";
  syncAuthView();
}

function bindForms() {
  document.getElementById("memberForm").addEventListener("submit", handleMemberSubmit);
  document
    .getElementById("showMemberUpdateFormBtn")
    .addEventListener("click", showMemberUpdateForm);
  document
    .getElementById("memberClearBtn")
    .addEventListener("click", handleMemberClearAction);
  document
    .getElementById("memberResetBtn")
    .addEventListener("click", resetMemberUpdateForm);
  document
    .getElementById("addFamilyMemberBtn")
    .addEventListener("click", () => addFamilyMemberRow());
  document
    .getElementById("collectionForm")
    .addEventListener("submit", handleCollectionSubmit);
  document.getElementById("donationForm").addEventListener("submit", handleDonationSubmit);
  document.getElementById("eventForm").addEventListener("submit", handleEventSubmit);
  document
    .getElementById("announcementForm")
    .addEventListener("submit", handleAnnouncementSubmit);
  document.getElementById("memberSearch").addEventListener("input", renderMembers);
  document.getElementById("memberPhoto").addEventListener("change", (event) => {
    const file = event.target.files[0];
    updateUploadStatus("memberPhotoStatus", file ? "#" : "", file?.name || "");
  });
  document.getElementById("memberAadhaarNumber").addEventListener("input", (event) => {
    event.target.value = formatAadhaarNumber(event.target.value);
  });
  document.getElementById("memberAadhaarCard").addEventListener("change", (event) => {
    const file = event.target.files[0];
    updateUploadStatus("memberAadhaarStatus", file ? "#" : "", file?.name || "");
  });

  document.querySelectorAll("[data-clear-form]").forEach((button) => {
    button.addEventListener("click", () => clearForm(button.dataset.clearForm));
  });
}

function bindUtilityActions() {
  document.getElementById("downloadBackupBtn").addEventListener("click", downloadBackup);
  document.getElementById("exportMembersCsvBtn").addEventListener("click", () => {
    exportRows("csv", "milan-mandir-members", getMembersExportRows());
  });
  document.getElementById("exportMembersExcelBtn").addEventListener("click", () => {
    exportRows("excel", "milan-mandir-members", getMembersExportRows());
  });
  document.getElementById("exportCollectionsCsvBtn").addEventListener("click", () => {
    exportRows("csv", "milan-mandir-monthly-collections", getCollectionsExportRows());
  });
  document.getElementById("exportCollectionsExcelBtn").addEventListener("click", () => {
    exportRows("excel", "milan-mandir-monthly-collections", getCollectionsExportRows());
  });
  document.getElementById("exportDonationsCsvBtn").addEventListener("click", () => {
    exportRows("csv", "milan-mandir-donations", getDonationsExportRows());
  });
  document.getElementById("exportDonationsExcelBtn").addEventListener("click", () => {
    exportRows("excel", "milan-mandir-donations", getDonationsExportRows());
  });
  document.getElementById("exportPendingCsvBtn").addEventListener("click", () => {
    exportRows("csv", "milan-mandir-pending-monthly-collections", getPendingCollectionsExportRows());
  });
  document.getElementById("exportPendingExcelBtn").addEventListener("click", () => {
    exportRows("excel", "milan-mandir-pending-monthly-collections", getPendingCollectionsExportRows());
  });
  document.getElementById("resetDataBtn").addEventListener("click", () => {
    const shouldReset = window.confirm(
      "Restore the original sample data? This will replace the current records saved in this browser."
    );

    if (!shouldReset) {
      return;
    }

    state = cloneData(seedData);
    persistState();
    resetAllForms();
    renderAll();
  });
}

function syncAuthView() {
  const authShell = document.getElementById("authShell");
  const appShell = document.getElementById("appShell");

  if (!currentSession) {
    authShell.classList.remove("is-hidden");
    appShell.classList.add("is-hidden");
    return;
  }

  authShell.classList.add("is-hidden");
  appShell.classList.remove("is-hidden");
  applyAccessControl();
  activateTab(getDefaultTabForCurrentRole());
  renderAll();
}

function applyAccessControl() {
  const isAdminUser = isAdmin();
  const allowedTabs = isAdminUser
    ? ["dashboard", "members", "collections", "donations", "events", "announcements"]
    : ["dashboard", "members", "collections", "events", "announcements"];

  document.getElementById("currentUserLabel").textContent = currentSession.name;
  document.getElementById("currentRoleLabel").textContent = isAdminUser
    ? "Admin access"
    : "Member access";

  document.querySelectorAll(".nav-tabs__item").forEach((button) => {
    button.classList.toggle("is-hidden", !allowedTabs.includes(button.dataset.target));
  });

  document.querySelector(".sidebar-card").classList.toggle("is-hidden", !isAdminUser);
  document.querySelector("#members .two-column").classList.toggle("member-view", !isAdminUser);
  document
    .querySelector("#collections .two-column")
    .classList.toggle("member-view", !isAdminUser);
  document
    .querySelector("#collections article.content-card:first-child")
    .classList.toggle("is-hidden", !isAdminUser);
  document
    .querySelector("#events .two-column")
    .classList.toggle("member-view", !isAdminUser);
  document
    .querySelector("#events article.content-card:first-child")
    .classList.toggle("is-hidden", !isAdminUser);
  document
    .querySelector("#announcements .two-column")
    .classList.toggle("member-view", !isAdminUser);
  document
    .querySelector("#announcements article.content-card:first-child")
    .classList.toggle("is-hidden", !isAdminUser);
  document.getElementById("memberSearch").classList.toggle("is-hidden", !isAdminUser);
  document.getElementById("memberListTitle").textContent = isAdminUser
    ? "Registered Members"
    : "My Member Profile";
  document.getElementById("memberRequestQueueTitle").textContent = isAdminUser
    ? "Member Update Requests"
    : "My Update Request Status";
  document.querySelectorAll(".admin-export").forEach((element) => {
    element.classList.toggle("is-hidden", !isAdminUser);
  });

  if (!allowedTabs.includes(getActiveTab())) {
    activateTab("dashboard");
  }

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("is-hidden", !allowedTabs.includes(panel.id));
  });
}

function setAuthMessage(message) {
  document.getElementById("authMessage").textContent = message;
}

async function handleMemberSubmit(event) {
  event.preventDefault();
  const editId = document.getElementById("memberId").value;
  const existingMember = findExisting("members", editId) || {};
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
  const payload = buildMemberPayload(editId || createId(), existingMember, memberPhoto, aadharCard);

  if (isMember()) {
    submitMemberUpdateRequest(payload);
    return;
  }

  upsertRecord("members", payload);
  clearForm("member");
  setMemberFormNotice(`Member details saved. Member ID: ${payload.memberCode}`);
  renderAll();
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

function submitMemberUpdateRequest(payload) {
  const member = getCurrentMember();

  if (!member) {
    logout();
    return;
  }

  const existingRequest = getPendingMemberUpdateRequest(member.id);
  const requestRecord = {
    id: existingRequest?.id || createId(),
    memberId: member.id,
    memberName: member.name,
    proposedData: payload,
    status: "Pending",
    requestedAt: existingRequest?.requestedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reviewedAt: "",
    reviewedBy: "",
  };

  upsertRecord("memberUpdateRequests", requestRecord);
  setMemberFormNotice(
    existingRequest
      ? "Your pending update request was updated and is waiting for admin approval."
      : "Your profile update request was sent for admin approval."
  );
  isMemberUpdateFormVisible = false;
  renderAll();
}

function handleCollectionSubmit(event) {
  event.preventDefault();
  const editId = document.getElementById("collectionId").value;
  const payload = {
    id: editId || createId(),
    memberId: document.getElementById("collectionMember").value,
    month: document.getElementById("collectionMonth").value,
    amount: Number(document.getElementById("collectionAmount").value),
    paymentDate: document.getElementById("collectionDate").value,
    status: document.getElementById("collectionStatus").value,
    remarks: document.getElementById("collectionRemarks").value.trim(),
    createdAt: findExisting("collections", editId)?.createdAt || new Date().toISOString(),
  };

  upsertRecord("collections", payload);
  clearForm("collection");
  renderAll();
}

function handleDonationSubmit(event) {
  event.preventDefault();
  const editId = document.getElementById("donationId").value;
  const payload = {
    id: editId || createId(),
    donorName: document.getElementById("donorName").value.trim(),
    donorPhone: document.getElementById("donorPhone").value.trim(),
    amount: Number(document.getElementById("donationAmount").value),
    donationDate: document.getElementById("donationDate").value,
    purpose: document.getElementById("donationPurpose").value.trim(),
    notes: document.getElementById("donationNotes").value.trim(),
    createdAt: findExisting("donations", editId)?.createdAt || new Date().toISOString(),
  };

  upsertRecord("donations", payload);
  clearForm("donation");
  renderAll();
}

function handleEventSubmit(event) {
  event.preventDefault();
  const editId = document.getElementById("eventId").value;
  const payload = {
    id: editId || createId(),
    title: document.getElementById("eventTitle").value.trim(),
    eventDate: document.getElementById("eventDate").value,
    venue: document.getElementById("eventVenue").value.trim(),
    coordinator: document.getElementById("eventCoordinator").value.trim(),
    description: document.getElementById("eventDescription").value.trim(),
    createdAt: findExisting("events", editId)?.createdAt || new Date().toISOString(),
  };

  upsertRecord("events", payload);
  clearForm("event");
  renderAll();
}

function handleAnnouncementSubmit(event) {
  event.preventDefault();
  const editId = document.getElementById("announcementId").value;
  const payload = {
    id: editId || createId(),
    title: document.getElementById("announcementTitle").value.trim(),
    announcementDate: document.getElementById("announcementDate").value,
    category: document.getElementById("announcementCategory").value,
    status: document.getElementById("announcementStatus").value,
    message: document.getElementById("announcementMessage").value.trim(),
    createdAt: findExisting("announcements", editId)?.createdAt || new Date().toISOString(),
  };

  upsertRecord("announcements", payload);
  clearForm("announcement");
  renderAll();
}

function upsertRecord(section, payload) {
  const index = state[section].findIndex((item) => item.id === payload.id);

  if (index >= 0) {
    state[section][index] = payload;
  } else {
    state[section].unshift(payload);
  }

  persistState();
}

function findExisting(section, id) {
  return state[section].find((item) => item.id === id);
}

function clearForm(type) {
  const clearConfig = {
    member: {
      formId: "memberForm",
      titleId: "memberFormTitle",
      title: "Register Member",
      hiddenId: "memberId",
    },
    collection: {
      formId: "collectionForm",
      titleId: "collectionFormTitle",
      title: "Add Monthly Collection",
      hiddenId: "collectionId",
    },
    donation: {
      formId: "donationForm",
      titleId: "donationFormTitle",
      title: "Add Donation",
      hiddenId: "donationId",
    },
    event: {
      formId: "eventForm",
      titleId: "eventFormTitle",
      title: "Create Event",
      hiddenId: "eventId",
    },
    announcement: {
      formId: "announcementForm",
      titleId: "announcementFormTitle",
      title: "Post Announcement",
      hiddenId: "announcementId",
    },
  };

  const config = clearConfig[type];
  document.getElementById(config.formId).reset();
  document.getElementById(config.hiddenId).value = "";
  document.getElementById(config.titleId).textContent = config.title;
  setMemberFormNotice("");

  if (type === "collection") {
    populateMemberOptions();
    document.getElementById("collectionMonth").value = currentMonthISO;
    document.getElementById("collectionDate").value = todayISO;
    document.getElementById("collectionAmount").value = DEFAULT_MONTHLY_COLLECTION_AMOUNT;
    document.getElementById("collectionStatus").value = "Paid";
  }

  if (type === "member") {
    if (isMember()) {
      isMemberUpdateFormVisible = false;
      syncMemberFormForCurrentRole();
      return;
    }

    document.getElementById("memberCode").value = "";
    document.getElementById("memberDob").value = "";
    document.getElementById("memberAadhaarNumber").value = "";
    renderFamilyMemberRows();
    updateUploadStatus("memberPhotoStatus");
    updateUploadStatus("memberAadhaarStatus");
  }

  if (type === "donation") {
    document.getElementById("donationDate").value = todayISO;
  }

  if (type === "event") {
    document.getElementById("eventDate").value = todayISO;
  }

  if (type === "announcement") {
    document.getElementById("announcementDate").value = todayISO;
    document.getElementById("announcementStatus").value = "Active";
  }
}

function resetAllForms() {
  ["member", "collection", "donation", "event", "announcement"].forEach(clearForm);
}

function handleMemberClearAction() {
  if (isMember()) {
    cancelMemberUpdateForm();
    return;
  }

  clearForm("member");
}

function cancelMemberUpdateForm() {
  if (!isMember()) {
    return;
  }

  isMemberUpdateFormVisible = false;
  setMemberFormNotice("");
  renderAll();
}

function resetMemberUpdateForm() {
  if (!isMember()) {
    return;
  }

  document.getElementById("memberForm").reset();
  document.getElementById("memberId").value = getCurrentMember()?.id || "";
  document.getElementById("memberCode").value = getCurrentMember()?.memberCode || "";
  document.getElementById("memberDob").value = "";
  document.getElementById("memberAadhaarNumber").value = "";
  renderFamilyMemberRows();
  updateUploadStatus("memberPhotoStatus");
  updateUploadStatus("memberAadhaarStatus");
  setMemberFormNotice("Form cleared. You can enter the updated details again.");
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

function syncMemberFormForCurrentRole() {
  const memberFormTitle = document.getElementById("memberFormTitle");
  const memberSubmitBtn = document.getElementById("memberSubmitBtn");
  const memberResetBtn = document.getElementById("memberResetBtn");
  const memberClearBtn = document.getElementById("memberClearBtn");
  const showMemberUpdateFormBtn = document.getElementById("showMemberUpdateFormBtn");
  const member = getCurrentMember();
  const pendingRequest = member ? getPendingMemberUpdateRequest(member.id) : null;

  if (isMember() && member) {
    const source = pendingRequest?.proposedData || member;
    memberFormTitle.textContent = "Request Profile Update";
    memberSubmitBtn.textContent = pendingRequest ? "Update Request" : "Send Update Request";
    memberResetBtn.classList.remove("is-hidden");
    memberClearBtn.textContent = "Cancel";
    showMemberUpdateFormBtn.textContent = pendingRequest
      ? "Update Pending Member Detail"
      : "Update Member Detail";

    if (isMemberUpdateFormVisible) {
      fillMemberForm(source);
      setMemberFormNotice(
        pendingRequest
          ? "You already have a pending request. You can revise it before admin approval."
          : "You can request changes to your profile. Updates will be applied only after admin approval."
      );
    } else {
      setMemberFormNotice("");
    }

    return;
  }

  memberFormTitle.textContent = "Register Member";
  memberSubmitBtn.textContent = "Save Member";
  memberResetBtn.classList.add("is-hidden");
  memberClearBtn.textContent = "Clear";
  showMemberUpdateFormBtn.textContent = "Update Member Detail";
}

function getPendingMemberUpdateRequest(memberId) {
  return state.memberUpdateRequests.find(
    (item) => item.memberId === memberId && item.status === "Pending"
  );
}

function getLatestMemberUpdateRequest(memberId) {
  return state.memberUpdateRequests
    .filter((item) => item.memberId === memberId)
    .sort((a, b) => new Date(b.updatedAt || b.requestedAt) - new Date(a.updatedAt || a.requestedAt))[0];
}

function setMemberFormNotice(message) {
  document.getElementById("memberFormNotice").textContent = message;
}

function showMemberUpdateForm() {
  if (!isMember()) {
    return;
  }

  isMemberUpdateFormVisible = true;
  renderAll();
}

function renderAll() {
  syncMemberFormForCurrentRole();
  syncMemberSectionVisibility();
  populateMemberOptions();
  renderDashboard();
  renderMembers();
  renderMemberUpdateRequests();
  renderCollections();
  renderDonations();
  renderEvents();
  renderAnnouncements();
}

function syncMemberSectionVisibility() {
  document
    .getElementById("adminMemberRegistrationCard")
    .classList.toggle("is-hidden", !isAdmin());
  document
    .getElementById("memberUpdateToggleBar")
    .classList.toggle("is-hidden", !isMember());
  document
    .getElementById("memberFormCard")
    .classList.toggle("is-hidden", !isMember() || !isMemberUpdateFormVisible);
}

function renderDashboard() {
  if (isMember()) {
    renderMemberDashboard();
    return;
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const previousMonth = getRelativeMonthKey(-1);
  const paidMembersThisMonth = getPaidMemberIdsForMonth(currentMonth);
  const pendingUpdateRequests = state.memberUpdateRequests.filter(
    (item) => item.status === "Pending"
  );
  const allUpdateRequests = state.memberUpdateRequests
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.requestedAt) - new Date(a.updatedAt || a.requestedAt));
  const monthlyFinanceSummary = getMonthlyFinanceSummary();

  const stats = [
    { label: "Registered Members", value: state.members.length },
    { label: "Paid This Month", value: paidMembersThisMonth.size },
    { label: "Not Paid This Month", value: Math.max(state.members.length - paidMembersThisMonth.size, 0) },
    { label: "Pending Update Requests", value: pendingUpdateRequests.length },
  ];

  document.getElementById("statsGrid").innerHTML = stats
    .map(
      (item) => `
        <article>
          <p>${item.label}</p>
          <strong>${item.value}</strong>
        </article>
      `
    )
    .join("");

  document.getElementById("dashboardPrimaryCardTitle").textContent = "Update Requests Received";
  document.getElementById("dashboardPrimaryCardMeta").textContent = allUpdateRequests.length
    ? `${pendingUpdateRequests.length} pending request(s)`
    : "No requests received yet";
  document.getElementById("dashboardPrimaryContent").innerHTML = allUpdateRequests.length
    ? allUpdateRequests
        .map(
          (request) => `
            <article class="record-item">
              <div class="record-title">
                <strong>${request.memberName}</strong>
                <span class="tag ${
                  request.status === "Pending"
                    ? "tag--warning"
                    : request.status === "Approved"
                      ? "tag--success"
                      : ""
                }">
                  ${request.status}
                </span>
              </div>
              <div class="record-tags">
                <span class="tag">${request.proposedData.memberCode || "Member ID pending"}</span>
                <span class="tag">${request.proposedData.phone || "Phone not added"}</span>
              </div>
              <div class="record-meta">
                Requested on ${formatDateTime(request.requestedAt)}<br />
                Last updated ${formatDateTime(request.updatedAt || request.requestedAt)}<br />
                ${
                  request.reviewedAt
                    ? `Reviewed on ${formatDateTime(request.reviewedAt)} by ${request.reviewedBy}`
                    : "Awaiting admin review"
                }
              </div>
            </article>
          `
        )
        .join("")
    : `<div class="empty-state">No update requests have been received from members yet.</div>`;

  document.getElementById("dashboardSideCardTitle").textContent = "Pending Monthly Payments";
  document.getElementById("dashboardMonthlySummaryCard").classList.remove("is-hidden");
  document.getElementById("dashboardMonthlySummaryTitle").textContent =
    "Last 6 Months Financial Summary";
  document.getElementById("dashboardMonthlySummaryMeta").textContent =
    "Monthly collection and donation totals";
  document.getElementById("dashboardMonthlySummaryList").innerHTML = monthlyFinanceSummary
    .map(
      (item) => `
        <article class="record-item">
          <div class="record-title">
            <strong>${item.label}</strong>
          </div>
          <div class="record-tags">
            <a
              class="tag tag-button"
              href="${buildDashboardDetailPageUrl(item.key, "collections")}"
            >
              All Collections ${formatCurrency(item.collectionTotal)}
            </a>
            <a
              class="tag tag-button"
              href="${buildDashboardDetailPageUrl(item.key, "donations")}"
            >
              Donations ${formatCurrency(item.donationTotal)}
            </a>
            <a
              class="tag tag-button"
              href="${buildDashboardDetailPageUrl(item.key, "collections")}"
            >
              ${item.collectionCount} collection record(s)
            </a>
            <a
              class="tag tag-button"
              href="${buildDashboardDetailPageUrl(item.key, "donations")}"
            >
              ${item.donationCount} donation record(s)
            </a>
          </div>
          <div class="record-meta">
            Total collection received in ${item.label}: ${formatCurrency(item.collectionTotal)}<br />
            Total donation received in ${item.label}: ${formatCurrency(item.donationTotal)}<br />
            Collection record(s): ${item.collectionCount} | Donation record(s): ${item.donationCount}
          </div>
        </article>
      `
    )
    .join("");

  const pendingSummary = getPendingPaymentSummary(currentMonth, previousMonth);
  document.getElementById("recentActivity").innerHTML = pendingSummary.length
    ? pendingSummary
        .map(
          (item) => `
            <li>
              <strong>${item.name}</strong>
              <div class="record-meta">
                Current month: ${item.currentMonthPending ? "Pending" : "Paid / No pending record"}<br />
                Previous month: ${item.previousMonthPending ? "Pending" : "Paid / No pending record"}<br />
                Total pending months: ${item.totalPendingMonths}
              </div>
            </li>
          `
        )
        .join("")
    : `<li class="empty-state">No pending monthly payment record found for the current or previous month.</li>`;
}

function renderMemberDashboard() {
  const member = getCurrentMember();

  if (!member) {
    logout();
    return;
  }

  const memberCollections = state.collections.filter((item) => item.memberId === member.id);
  const paidCollections = memberCollections.filter((item) => item.status === "Paid");
  const pendingMonths = getPendingMonthsForMember(member.id);
  const upcomingEvents = state.events.filter((item) => new Date(item.eventDate) >= new Date(todayISO));
  const activeAnnouncements = state.announcements.filter((item) => item.status === "Active");
  document.getElementById("dashboardMonthlySummaryCard").classList.add("is-hidden");

  const stats = [
    { label: "My Paid Collections", value: formatCurrency(sumAmounts(paidCollections)) },
    { label: "My Pending Months", value: pendingMonths.length },
    { label: "Upcoming Events", value: upcomingEvents.length },
    { label: "Active Notices", value: activeAnnouncements.length },
  ];

  document.getElementById("dashboardPrimaryCardTitle").textContent = "My Collection Status";
  document.getElementById("dashboardPrimaryCardMeta").textContent = member.memberCode || "";
  document.getElementById("dashboardSideCardTitle").textContent = "Announcements and Updates";

  document.getElementById("statsGrid").innerHTML = stats
    .map(
      (item) => `
        <article>
          <p>${item.label}</p>
          <strong>${item.value}</strong>
        </article>
      `
    )
    .join("");

  const memberCollectionSummary = memberCollections
    .slice()
    .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
    .slice(0, 6);
  document.getElementById("dashboardPrimaryContent").innerHTML = memberCollectionSummary.length
    ? memberCollectionSummary
        .map(
          (item) => `
            <article class="record-item">
              <div class="record-title">
                <strong>${formatMonth(item.month)}</strong>
                <span class="tag ${item.status === "Paid" ? "tag--success" : "tag--warning"}">
                  ${item.status}
                </span>
              </div>
              <div class="record-tags">
                <span class="tag">${formatCurrency(item.amount)}</span>
                <span class="tag">Paid on ${formatDate(item.paymentDate)}</span>
              </div>
              <div class="record-meta">${item.remarks || "No remarks added."}</div>
            </article>
          `
        )
        .join("")
    : `<div class="empty-state">No collection records found for your member account yet.</div>`;

  const activity = [
    ...memberCollections.map((item) => ({
      date: item.createdAt,
      text: `My collection: ${formatMonth(item.month)} - ${formatCurrency(item.amount)} (${item.status})`,
    })),
    ...upcomingEvents.map((item) => ({
      date: item.createdAt,
      text: `Event: ${item.title} on ${formatDate(item.eventDate)}`,
    })),
    ...activeAnnouncements.map((item) => ({
      date: item.createdAt,
      text: `Announcement: ${item.title}`,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 7);

  document.getElementById("recentActivity").innerHTML = activity.length
    ? activity
        .map(
          (item) => `
            <li>
              <strong>${item.text}</strong>
              <div class="record-meta">${formatDateTime(item.date)}</div>
            </li>
          `
        )
        .join("")
    : `<li class="empty-state">No member activity recorded yet.</li>`;
}

function populateMemberOptions() {
  const select = document.getElementById("collectionMember");
  const currentValue = select.value;
  const baseOption = `<option value="">Select Member</option>`;
  const options = state.members
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((member) => `<option value="${member.id}">${member.name}</option>`)
    .join("");

  select.innerHTML = baseOption + options;

  if (currentValue) {
    select.value = currentValue;
  }
}

function renderMembers() {
  const query = document.getElementById("memberSearch").value.trim().toLowerCase();
  const sourceMembers = isMember() ? [getCurrentMember()].filter(Boolean) : state.members;
  const records = sourceMembers
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((member) =>
      [
        member.name,
        member.phone,
        member.occupation,
        formatAddressFields(member.presentAddressFields || {}),
        formatAddressFields(member.permanentAddressFields || {}),
        member.familyMembers.map((item) => `${item.name} ${item.relation}`).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );

  renderRecordList("memberList", records, {
    emptyText: isMember() ? "Member profile not found." : "No members found.",
    build: (member) => {
      const familyDetails = member.familyMembers.length
        ? member.familyMembers.map((item) => `${item.name} (${item.relation})`).join(", ")
        : "No family details added.";
      const attachmentTags = [
        member.memberPhotoData ? `<span class="tag">Photo uploaded</span>` : "",
        member.aadharCardData ? `<span class="tag">Aadhaar uploaded</span>` : "",
      ].join("");

      return `
        <div class="member-media">
          ${
            member.memberPhotoData
              ? `<img class="member-photo-thumb" src="${member.memberPhotoData}" alt="${member.name}" />`
              : ""
          }
          <div class="member-details">
            <div class="record-title">
              <strong>${member.name}</strong>
              <span class="tag">${member.gender}</span>
            </div>
            <div class="record-tags">
              <span class="tag">${member.memberCode || "Member ID pending"}</span>
              <span class="tag">${member.phone}</span>
              ${member.occupation ? `<span class="tag">${member.occupation}</span>` : ""}
              <span class="tag">DOB ${member.dob ? formatDate(member.dob) : "Not added"}</span>
              ${attachmentTags}
            </div>
            <div class="record-meta">
              Aadhaar Number: ${member.aadharNumber || "Not added"}<br />
              Present Address: ${formatAddressFields(member.presentAddressFields || {}) || "Not added"}<br />
              Permanent Address: ${formatAddressFields(member.permanentAddressFields || {}) || "Not added"}<br />
              ${member.email || "No email"}<br />
              Family: ${familyDetails}<br />
              ${buildAttachmentLink(member.aadharCardData, member.aadharCardName, "Aadhaar Card")}
            </div>
          </div>
        </div>
      `;
    },
    onEdit: (member) => {
      window.location.href = buildMemberRegistrationPageUrl(member.id);
    },
    onDelete: (member) => deleteRecord("members", member.id, `Delete member ${member.name}?`),
    showActions: isAdmin(),
  });
}

function renderMemberUpdateRequests() {
  const container = document.getElementById("memberUpdateRequestsList");

  if (isAdmin()) {
    const requests = state.memberUpdateRequests
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.requestedAt) - new Date(a.updatedAt || a.requestedAt));

    if (!requests.length) {
      container.innerHTML = `<div class="empty-state">No member update requests yet.</div>`;
      return;
    }

    container.innerHTML = "";
    requests.forEach((request) => {
      const member = findExisting("members", request.memberId);
      const card = document.createElement("article");
      card.className = "record-item";
      card.innerHTML = `
        <div class="record-title">
          <strong>${request.memberName}</strong>
          <span class="tag ${request.status === "Pending" ? "tag--warning" : "tag--success"}">
            ${request.status}
          </span>
        </div>
        <div class="record-meta">
          Requested on ${formatDateTime(request.requestedAt)}<br />
          Last updated ${formatDateTime(request.updatedAt || request.requestedAt)}<br />
          ${request.reviewedAt ? `Reviewed on ${formatDateTime(request.reviewedAt)} by ${request.reviewedBy}<br />` : ""}
          Phone: ${request.proposedData.phone || "Not added"}<br />
          Present Address: ${formatAddressFields(request.proposedData.presentAddressFields || {}) || "Not added"}<br />
          Permanent Address: ${formatAddressFields(request.proposedData.permanentAddressFields || {}) || "Not added"}<br />
          Family: ${formatFamilyDetails(request.proposedData.familyMembers)}<br />
          Current member record: ${member ? "Available" : "Not found"}
        </div>
      `;

      if (request.status === "Pending") {
        const actions = document.createElement("div");
        actions.className = "record-actions";

        const approveBtn = document.createElement("button");
        approveBtn.className = "primary-button ghost-button--small";
        approveBtn.textContent = "Approve";
        approveBtn.addEventListener("click", () => approveMemberUpdateRequest(request.id));

        const rejectBtn = document.createElement("button");
        rejectBtn.className = "ghost-button ghost-button--small";
        rejectBtn.textContent = "Reject";
        rejectBtn.addEventListener("click", () => rejectMemberUpdateRequest(request.id));

        actions.appendChild(approveBtn);
        actions.appendChild(rejectBtn);
        card.appendChild(actions);
      }

      container.appendChild(card);
    });

    return;
  }

  const member = getCurrentMember();
  const latestRequest = member ? getLatestMemberUpdateRequest(member.id) : null;

  if (!latestRequest) {
    container.innerHTML = `<div class="empty-state">No update request submitted yet.</div>`;
    return;
  }

  container.innerHTML = `
    <article class="record-item">
      <div class="record-title">
        <strong>${latestRequest.memberName}</strong>
        <span class="tag ${
          latestRequest.status === "Pending"
            ? "tag--warning"
            : latestRequest.status === "Approved"
              ? "tag--success"
              : ""
        }">
          ${latestRequest.status}
        </span>
      </div>
      <div class="record-meta">
        Requested on ${formatDateTime(latestRequest.requestedAt)}<br />
        Last updated ${formatDateTime(latestRequest.updatedAt || latestRequest.requestedAt)}<br />
        ${
          latestRequest.reviewedAt
            ? `Reviewed on ${formatDateTime(latestRequest.reviewedAt)} by ${latestRequest.reviewedBy}`
            : "Awaiting admin review"
        }
      </div>
    </article>
  `;
}

function approveMemberUpdateRequest(requestId) {
  const request = findExisting("memberUpdateRequests", requestId);

  if (!request) {
    return;
  }

  upsertRecord("members", normalizeMemberRecord(request.proposedData));
  request.status = "Approved";
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = currentSession.name;
  request.updatedAt = new Date().toISOString();
  upsertRecord("memberUpdateRequests", request);
  renderAll();
}

function rejectMemberUpdateRequest(requestId) {
  const request = findExisting("memberUpdateRequests", requestId);

  if (!request) {
    return;
  }

  request.status = "Rejected";
  request.reviewedAt = new Date().toISOString();
  request.reviewedBy = currentSession.name;
  request.updatedAt = new Date().toISOString();
  upsertRecord("memberUpdateRequests", request);
  renderAll();
}

function renderCollections() {
  const records = state.collections
    .slice()
    .filter((item) => (isMember() ? item.memberId === currentSession.memberId : true))
    .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

  renderRecordList("collectionList", records, {
    emptyText: isMember()
      ? "No collection records found for this member."
      : "No monthly collection records yet.",
    build: (item) => `
      <div class="record-title">
        <strong>${resolveMemberName(item.memberId)}</strong>
        <span class="tag ${item.status === "Paid" ? "tag--success" : "tag--warning"}">
          ${item.status}
        </span>
      </div>
      <div class="record-tags">
        <span class="tag">${formatMonth(item.month)}</span>
        <span class="tag">${formatCurrency(item.amount)}</span>
        <span class="tag">Paid on ${formatDate(item.paymentDate)}</span>
      </div>
      <div class="record-meta">${item.remarks || "No remarks added."}</div>
    `,
    onEdit: (item) => fillCollectionForm(item),
    onDelete: (item) =>
      deleteRecord(
        "collections",
        item.id,
        `Delete collection record for ${resolveMemberName(item.memberId)}?`
      ),
    showActions: isAdmin(),
    getExtraActions: (item) =>
      isMember() && item.status === "Paid"
        ? [
            {
              label: "Download Receipt",
              className: "ghost-button ghost-button--small",
              onClick: () => downloadMemberReceipt(item),
            },
          ]
        : [],
  });
}

function renderDonations() {
  const records = state.donations
    .slice()
    .sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate));

  renderRecordList("donationList", records, {
    emptyText: "No public donations recorded yet.",
    build: (item) => `
      <div class="record-title">
        <strong>${item.donorName}</strong>
        <span class="tag">${formatCurrency(item.amount)}</span>
      </div>
      <div class="record-tags">
        <span class="tag">${formatDate(item.donationDate)}</span>
        ${item.purpose ? `<span class="tag">${item.purpose}</span>` : ""}
        ${item.donorPhone ? `<span class="tag">${item.donorPhone}</span>` : ""}
      </div>
      <div class="record-meta">${item.notes || "No notes added."}</div>
    `,
    onEdit: (item) => fillDonationForm(item),
    onDelete: (item) =>
      deleteRecord("donations", item.id, `Delete donation record for ${item.donorName}?`),
    showActions: isAdmin(),
  });
}

function renderEvents() {
  const records = state.events
    .slice()
    .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

  renderRecordList("eventList", records, {
    emptyText: "No events created yet.",
    build: (item) => `
      <div class="record-title">
        <strong>${item.title}</strong>
        <span class="tag">${formatDate(item.eventDate)}</span>
      </div>
      <div class="record-tags">
        <span class="tag">${item.venue}</span>
        ${item.coordinator ? `<span class="tag">${item.coordinator}</span>` : ""}
      </div>
      <div class="record-meta">${item.description || "No description added."}</div>
    `,
    onEdit: (item) => fillEventForm(item),
    onDelete: (item) => deleteRecord("events", item.id, `Delete event ${item.title}?`),
    showActions: isAdmin(),
  });
}

function renderAnnouncements() {
  const records = state.announcements
    .slice()
    .sort((a, b) => new Date(b.announcementDate) - new Date(a.announcementDate));

  renderRecordList("announcementList", records, {
    emptyText: "No announcements posted yet.",
    build: (item) => `
      <div class="record-title">
        <strong>${item.title}</strong>
        <span class="tag ${item.status === "Active" ? "tag--success" : ""}">
          ${item.status}
        </span>
      </div>
      <div class="record-tags">
        <span class="tag">${item.category}</span>
        <span class="tag">${formatDate(item.announcementDate)}</span>
      </div>
      <div class="record-meta">${item.message}</div>
    `,
    onEdit: (item) => fillAnnouncementForm(item),
    onDelete: (item) =>
      deleteRecord("announcements", item.id, `Delete announcement ${item.title}?`),
    showActions: isAdmin(),
  });
}

function renderRecordList(containerId, records, config) {
  const container = document.getElementById(containerId);

  if (!records.length) {
    container.innerHTML = `<div class="empty-state">${config.emptyText}</div>`;
    return;
  }

  container.innerHTML = "";

  records.forEach((record) => {
    const card = document.createElement("article");
    card.className = "record-item";
    card.innerHTML = config.build(record);

    const extraActions = config.getExtraActions ? config.getExtraActions(record) : [];
    if (config.showActions !== false || extraActions.length) {
      const actions = document.createElement("div");
      actions.className = "record-actions";

      if (config.showActions !== false) {
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "ghost-button ghost-button--small";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => config.onEdit(record));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "ghost-button ghost-button--small";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => config.onDelete(record));

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);
      }

      extraActions.forEach((action) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = action.className || "ghost-button ghost-button--small";
        button.textContent = action.label;
        button.addEventListener("click", action.onClick);
        actions.appendChild(button);
      });

      card.appendChild(actions);
    }

    container.appendChild(card);
  });
}

function fillMemberForm(member) {
  document.getElementById("memberId").value = member.id;
  document.getElementById("memberCode").value = member.memberCode || "";
  document.getElementById("memberName").value = member.name;
  document.getElementById("memberGender").value = member.gender;
  document.getElementById("memberPhone").value = member.phone;
  document.getElementById("memberEmail").value = member.email;
  document.getElementById("memberOccupation").value = member.occupation;
  document.getElementById("memberDob").value = member.dob || "";
  document.getElementById("memberAadhaarNumber").value = member.aadharNumber || "";
  setAddressFieldsToForm("memberPresent", member.presentAddressFields || {});
  setAddressFieldsToForm("memberPermanent", member.permanentAddressFields || {});
  renderFamilyMemberRows(member.familyMembers);
  document.getElementById("memberPhoto").value = "";
  document.getElementById("memberAadhaarCard").value = "";
  updateUploadStatus("memberPhotoStatus", member.memberPhotoData, member.memberPhotoName);
  updateUploadStatus("memberAadhaarStatus", member.aadharCardData, member.aadharCardName);

  if (isAdmin()) {
    document.getElementById("memberFormTitle").textContent = `Edit Member: ${member.name}`;
  }
}

function fillCollectionForm(item) {
  document.getElementById("collectionFormTitle").textContent =
    `Edit Collection: ${resolveMemberName(item.memberId)}`;
  document.getElementById("collectionId").value = item.id;
  document.getElementById("collectionMember").value = item.memberId;
  document.getElementById("collectionMonth").value = item.month;
  document.getElementById("collectionAmount").value = item.amount;
  document.getElementById("collectionDate").value = item.paymentDate;
  document.getElementById("collectionStatus").value = item.status;
  document.getElementById("collectionRemarks").value = item.remarks;
}

function fillDonationForm(item) {
  document.getElementById("donationFormTitle").textContent = `Edit Donation: ${item.donorName}`;
  document.getElementById("donationId").value = item.id;
  document.getElementById("donorName").value = item.donorName;
  document.getElementById("donorPhone").value = item.donorPhone;
  document.getElementById("donationAmount").value = item.amount;
  document.getElementById("donationDate").value = item.donationDate;
  document.getElementById("donationPurpose").value = item.purpose;
  document.getElementById("donationNotes").value = item.notes;
}

function fillEventForm(item) {
  document.getElementById("eventFormTitle").textContent = `Edit Event: ${item.title}`;
  document.getElementById("eventId").value = item.id;
  document.getElementById("eventTitle").value = item.title;
  document.getElementById("eventDate").value = item.eventDate;
  document.getElementById("eventVenue").value = item.venue;
  document.getElementById("eventCoordinator").value = item.coordinator;
  document.getElementById("eventDescription").value = item.description;
}

function fillAnnouncementForm(item) {
  document.getElementById("announcementFormTitle").textContent =
    `Edit Announcement: ${item.title}`;
  document.getElementById("announcementId").value = item.id;
  document.getElementById("announcementTitle").value = item.title;
  document.getElementById("announcementDate").value = item.announcementDate;
  document.getElementById("announcementCategory").value = item.category;
  document.getElementById("announcementStatus").value = item.status;
  document.getElementById("announcementMessage").value = item.message;
}

function deleteRecord(section, id, prompt) {
  if (!window.confirm(prompt)) {
    return;
  }

  state[section] = state[section].filter((item) => item.id !== id);
  persistState();
  renderAll();
}

function downloadBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `milan-mandir-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadMemberReceipt(collection) {
  const member = findExisting("members", collection.memberId);

  if (!member) {
    window.alert("Member record not found for this receipt.");
    return;
  }

  const receiptHtml = buildMemberReceiptHtml(collection, member);
  const safeMemberCode = (member.memberCode || "member")
    .replaceAll("/", "-")
    .replaceAll("\\", "-");
  downloadFile(
    `${safeMemberCode}-${collection.month}-receipt.html`,
    "text/html;charset=utf-8;",
    receiptHtml
  );
}

function exportRows(format, fileBaseName, rows) {
  if (format === "csv") {
    downloadCsv(fileBaseName, rows);
    return;
  }

  downloadExcel(fileBaseName, rows);
}

function downloadCsv(fileBaseName, rows) {
  const csvContent = buildCsv(rows);
  downloadFile(`${fileBaseName}.csv`, "text/csv;charset=utf-8;", csvContent);
}

function downloadExcel(fileBaseName, rows) {
  const excelContent = buildExcelTable(rows);
  downloadFile(`${fileBaseName}.xls`, "application/vnd.ms-excel;charset=utf-8;", excelContent);
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

function buildMemberReceiptHtml(collection, member) {
  const receiptNumber = `MMR-${collection.month.replace("-", "")}-${(member.memberCode || "MMJ").replaceAll("/", "")}`;
  const paymentDate = collection.paymentDate ? formatDate(collection.paymentDate) : "Not available";
  const amount = formatCurrency(collection.amount);
  const monthLabel = formatMonth(collection.month);
  const logoUrl = new URL("./assets/mandir-logo-transparent.png", window.location.href).href;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Monthly Receipt - ${escapeHtml(member.name)}</title>
    <style>
      body {
        margin: 0;
        padding: 32px;
        font-family: Georgia, "Times New Roman", serif;
        background: #f8f3ea;
        color: #2f2318;
      }

      .receipt {
        max-width: 760px;
        margin: 0 auto;
        background: #fffdf9;
        border: 1px solid #d8c3a5;
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 18px 40px rgba(80, 42, 18, 0.08);
      }

      .receipt__header {
        border-bottom: 2px solid #c85e12;
        padding-bottom: 20px;
        margin-bottom: 24px;
        text-align: center;
      }

      .receipt__badge {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 999px;
        background: #f6e2cb;
        color: #8c4314;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .receipt__logo {
        width: 116px;
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto 16px;
      }

      h1 {
        margin: 16px 0 8px;
        font-size: 34px;
      }

      h2 {
        margin: 0 0 8px;
        font-size: 22px;
      }

      p {
        margin: 0;
        line-height: 1.6;
      }

      .receipt__grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
        margin-top: 24px;
      }

      .receipt__card {
        border: 1px solid #eadbcc;
        border-radius: 16px;
        padding: 18px;
        background: #fff;
      }

      .receipt__label {
        display: block;
        margin-bottom: 6px;
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #8a7767;
      }

      .receipt__value {
        font-size: 18px;
        font-weight: 700;
      }

      .receipt__amount {
        color: #17653a;
      }

      .receipt__footer {
        margin-top: 28px;
        padding-top: 18px;
        border-top: 1px dashed #d8c3a5;
      }

      .receipt__actions {
        margin-top: 24px;
      }

      .receipt__actions button {
        border: none;
        border-radius: 999px;
        padding: 12px 18px;
        background: #c85e12;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }

      @media print {
        body {
          background: #fff;
          padding: 0;
        }

        .receipt {
          box-shadow: none;
          border: none;
          border-radius: 0;
        }

        .receipt__actions {
          display: none;
        }
      }
    </style>
  </head>
  <body>
    <article class="receipt">
      <header class="receipt__header">
        <span class="receipt__badge">Monthly Collection Receipt</span>
        <img class="receipt__logo" src="${logoUrl}" alt="Milan Mandir Logo" />
        <h1>MILAN MANDIR</h1>
        <p>High School Colony, Ward No. 3, Jalukie, Dist: Peren, Nagaland - 797110, INDIA</p>
        <p>Email: milanmandirjalukie@gmail.com</p>
      </header>

      <section>
        <h2>Receipt Details</h2>
        <p>This receipt confirms the monthly collection received from the member listed below.</p>
      </section>

      <section class="receipt__grid">
        <div class="receipt__card">
          <span class="receipt__label">Receipt Number</span>
          <div class="receipt__value">${escapeHtml(receiptNumber)}</div>
        </div>
        <div class="receipt__card">
          <span class="receipt__label">Member ID</span>
          <div class="receipt__value">${escapeHtml(member.memberCode || "Not available")}</div>
        </div>
        <div class="receipt__card">
          <span class="receipt__label">Member Name</span>
          <div class="receipt__value">${escapeHtml(member.name)}</div>
        </div>
        <div class="receipt__card">
          <span class="receipt__label">Mobile Number</span>
          <div class="receipt__value">${escapeHtml(member.phone || "Not available")}</div>
        </div>
        <div class="receipt__card">
          <span class="receipt__label">Collection Month</span>
          <div class="receipt__value">${escapeHtml(monthLabel)}</div>
        </div>
        <div class="receipt__card">
          <span class="receipt__label">Payment Date</span>
          <div class="receipt__value">${escapeHtml(paymentDate)}</div>
        </div>
        <div class="receipt__card">
          <span class="receipt__label">Amount Received</span>
          <div class="receipt__value receipt__amount">${escapeHtml(amount)}</div>
        </div>
        <div class="receipt__card">
          <span class="receipt__label">Status</span>
          <div class="receipt__value">${escapeHtml(collection.status)}</div>
        </div>
      </section>

      <footer class="receipt__footer">
        <p><strong>Remarks:</strong> ${escapeHtml(collection.remarks || "No remarks added.")}</p>
        <p>This receipt is generated from the MILAN MANDIR management app.</p>
      </footer>

      <div class="receipt__actions">
        <button type="button" onclick="window.print()">Print Receipt</button>
      </div>
    </article>
  </body>
</html>`;
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

function getMembersExportRows() {
  return state.members
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((member) => ({
      "Member ID": member.memberCode || "",
      "Full Name": member.name,
      Gender: member.gender,
      Phone: member.phone,
      Email: member.email || "",
      Occupation: member.occupation || "",
      DOB: member.dob || "",
      "Aadhaar Number": member.aadharNumber || "",
      "Present House No.": member.presentAddressFields?.houseNo || "",
      "Present Location": member.presentAddressFields?.location || "",
      "Present Village/Town": member.presentAddressFields?.villageTown || "",
      "Present District": member.presentAddressFields?.district || "",
      "Present State": member.presentAddressFields?.state || "",
      "Present Pin Code": member.presentAddressFields?.pinCode || "",
      "Permanent House No.": member.permanentAddressFields?.houseNo || "",
      "Permanent Location": member.permanentAddressFields?.location || "",
      "Permanent Village/Town": member.permanentAddressFields?.villageTown || "",
      "Permanent District": member.permanentAddressFields?.district || "",
      "Permanent State": member.permanentAddressFields?.state || "",
      "Permanent Pin Code": member.permanentAddressFields?.pinCode || "",
      Family: formatFamilyDetails(member.familyMembers),
      "Photo File": member.memberPhotoName || "",
      "Aadhaar File": member.aadharCardName || "",
    }));
}

function getCollectionsExportRows() {
  return state.collections
    .slice()
    .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
    .map((item) => ({
      Member: resolveMemberName(item.memberId),
      Month: formatMonth(item.month),
      Amount: item.amount,
      Status: item.status,
      "Payment Date": item.paymentDate || "",
      Remarks: item.remarks || "",
    }));
}

function getDonationsExportRows() {
  return state.donations
    .slice()
    .sort((a, b) => new Date(b.donationDate) - new Date(a.donationDate))
    .map((item) => ({
      "Donor Name": item.donorName,
      "Contact Number": item.donorPhone || "",
      Amount: item.amount,
      "Donation Date": item.donationDate || "",
      Purpose: item.purpose || "",
      Notes: item.notes || "",
    }));
}

function getPendingCollectionsExportRows() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const previousMonth = getRelativeMonthKey(-1);

  return getPendingPaymentSummary(currentMonth, previousMonth).map((item) => ({
    Member: item.name,
    "Current Month Pending": item.currentMonthPending ? "Yes" : "No",
    "Previous Month Pending": item.previousMonthPending ? "Yes" : "No",
    "Total Pending Months": item.totalPendingMonths,
  }));
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

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
    return cloneData(seedData);
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      members: (parsed.members || []).map(normalizeMemberRecord),
      memberUpdateRequests: (parsed.memberUpdateRequests || []).map(normalizeMemberUpdateRequest),
      collections: parsed.collections || [],
      donations: parsed.donations || [],
      events: parsed.events || [],
      announcements: parsed.announcements || [],
    };
  } catch (error) {
    console.error("Failed to parse stored data. Restoring seed data.", error);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
    return cloneData(seedData);
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
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function persistSession() {
  if (!currentSession) {
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
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

function buildAttachmentLink(data, fileName, label) {
  if (!data || !fileName) {
    return `${label}: Not uploaded`;
  }

  return `${label}: <a href="${data}" target="_blank" rel="noopener noreferrer">${fileName}</a>`;
}

function normalizeMemberRecord(member) {
  const createdAt = member.createdAt || new Date().toISOString();
  const normalizedPhone = member.phone || "";
  return {
    ...member,
    createdAt,
    memberCode:
      member.memberCode || generateMemberCode(normalizedPhone, createdAt),
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

function normalizeMemberUpdateRequest(request) {
  return {
    id: request.id || createId(),
    memberId: request.memberId || "",
    memberName: request.memberName || "",
    proposedData: normalizeMemberRecord(request.proposedData || {}),
    status: request.status || "Pending",
    requestedAt: request.requestedAt || new Date().toISOString(),
    updatedAt: request.updatedAt || request.requestedAt || new Date().toISOString(),
    reviewedAt: request.reviewedAt || "",
    reviewedBy: request.reviewedBy || "",
  };
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

function resolveMemberName(memberId) {
  return state.members.find((member) => member.id === memberId)?.name || "Unknown Member";
}

function generateMemberCode(phone, registrationDate) {
  const year = new Date(registrationDate).getFullYear();
  const digits = String(phone || "").replace(/\D/g, "");
  const lastFourDigits = digits.slice(-4).padStart(4, "0");
  return `MMJ/${year}/${lastFourDigits}`;
}

function formatAadhaarNumber(value) {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 12);
  const parts = digits.match(/.{1,4}/g) || [];
  return parts.join("-");
}

function getLastSixMonths() {
  const months = [];
  const cursor = new Date();

  for (let index = 0; index <= 5; index += 1) {
    const item = new Date(cursor.getFullYear(), cursor.getMonth() - index, 1);
    months.push({
      key: `${item.getFullYear()}-${String(item.getMonth() + 1).padStart(2, "0")}`,
      label: item.toLocaleString("en-IN", { month: "short" }),
    });
  }

  return months;
}

function getRelativeMonthKey(offset) {
  const date = new Date();
  const relativeDate = new Date(date.getFullYear(), date.getMonth() + offset, 1);
  return `${relativeDate.getFullYear()}-${String(relativeDate.getMonth() + 1).padStart(2, "0")}`;
}

function getPendingPaymentSummary(currentMonth, previousMonth) {
  return state.members
    .map((member) => {
      const pendingMonths = getPendingMonthsForMember(member.id, currentMonth);

      return {
        name: member.name,
        currentMonthPending: pendingMonths.includes(currentMonth),
        previousMonthPending: pendingMonths.includes(previousMonth),
        totalPendingMonths: pendingMonths.length,
      };
    })
    .filter((item) => item.currentMonthPending || item.previousMonthPending)
    .sort((a, b) => {
      if (b.totalPendingMonths !== a.totalPendingMonths) {
        return b.totalPendingMonths - a.totalPendingMonths;
      }

      return a.name.localeCompare(b.name);
    });
}

function getPaidMemberIdsForMonth(month) {
  return new Set(
    state.collections
      .filter((item) => item.month === month && item.status === "Paid")
      .map((item) => item.memberId)
  );
}

function getPendingMonthsForMember(memberId, upToMonth = currentMonthISO) {
  const member = findExisting("members", memberId);

  if (!member) {
    return [];
  }

  const startMonth = getMemberStartMonth(member);
  const monthKeys = getMonthKeysBetween(startMonth, upToMonth);

  return monthKeys.filter((monthKey) => !hasPaidCollectionForMonth(memberId, monthKey));
}

function hasPaidCollectionForMonth(memberId, monthKey) {
  return state.collections.some(
    (item) => item.memberId === memberId && item.month === monthKey && item.status === "Paid"
  );
}

function getMemberStartMonth(member) {
  const createdAt = member?.createdAt || new Date().toISOString();
  const startDate = new Date(createdAt);

  if (Number.isNaN(startDate.getTime())) {
    return currentMonthISO;
  }

  return `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthKeysBetween(startMonth, endMonth) {
  const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
  const [endYear, endMonthNumber] = endMonth.split("-").map(Number);
  const startDate = new Date(startYear, (startMonthNumber || 1) - 1, 1);
  const endDate = new Date(endYear, (endMonthNumber || 1) - 1, 1);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    return [];
  }

  const months = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (cursor <= endDate) {
    months.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function getMonthlyFinanceSummary() {
  return getLastSixMonths().map((month) => {
    const collectionRecords = state.collections.filter(
      (item) => item.month === month.key && item.status === "Paid"
    );
    const donationRecords = state.donations.filter(
      (item) => (item.donationDate || "").slice(0, 7) === month.key
    );

    return {
      key: month.key,
      label: formatMonth(month.key),
      collectionTotal: sumAmounts(collectionRecords),
      donationTotal: sumAmounts(donationRecords),
      collectionCount: collectionRecords.length,
      donationCount: donationRecords.length,
    };
  });
}

function buildDashboardDetailPageUrl(monthKey, type) {
  return `./dashboard-detail.html?month=${encodeURIComponent(monthKey)}&type=${encodeURIComponent(type)}`;
}

function buildMemberRegistrationPageUrl(memberId = "") {
  return memberId
    ? `./member-registration.html?memberId=${encodeURIComponent(memberId)}`
    : "./member-registration.html";
}

function sumAmounts(records) {
  return records.reduce((sum, item) => sum + item.amount, 0);
}

function formatFamilyDetails(familyMembers = []) {
  if (!familyMembers.length) {
    return "No family details added";
  }

  return familyMembers.map((item) => `${item.name} (${item.relation || "Relation not set"})`).join(", ");
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

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMonth(value) {
  const [year, month] = value.split("-");
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(year), Number(month) - 1));
}
