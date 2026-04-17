import {
  FAMILY_RELATIONS,
  supabase,
  monthlyCollectionDefault,
  storageBucket,
  setTodayDateText,
  getTodayIso,
  getCurrentMonthKey,
  getMonthStartIso,
  formatDate,
  formatDateTime,
  formatCurrency,
  formatAadhaarNumber,
  normalizeAddressFields,
  formatAddress,
  normalizeFamilyMembers,
  formatFamilyDetails,
  getAddressFieldsFromForm,
  setAddressFieldsToForm,
  escapeHtml,
  escapeAttribute,
  openPopup,
  writePopupMessage,
  renderPopupDocument,
} from "./supabase-common.js";

const state = {
  session: null,
  profile: null,
  memberRecord: null,
  members: [],
  collections: [],
  donations: [],
  events: [],
  announcements: [],
  requests: [],
  auditLogs: [],
  auditLogsError: "",
  dashboardDetail: null,
};

let authHydrationPromise = null;
let nextPreferredTab = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  setTodayDateText("todayDate");
  bindTabs();
  bindAuth();
  bindForms();
  bindExportButtons();
  bindSearch();
  bindFamilyRequestActions();
  configureRoleVisibility();
  resetCollectionForm();
  resetDonationForm();
  resetEventForm();
  resetAnnouncementForm();
  resetRequestForm();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    setAuthMessage(error.message);
    return;
  }

  if (session) {
    try {
      await hydrateSession(session);
    } catch (hydrateError) {
      setAuthMessage(hydrateError.message);
      syncLoggedOutView();
    }
  } else {
    syncLoggedOutView();
  }

  supabase.auth.onAuthStateChange((_event, sessionValue) => {
    if (sessionValue?.user?.id) {
      const preferredTab = nextPreferredTab;
      nextPreferredTab = null;
      hydrateSession(sessionValue, preferredTab).catch((hydrateError) => {
        setAuthMessage(hydrateError.message);
        syncLoggedOutView();
      });
      return;
    }

    state.session = null;
    state.profile = null;
    state.memberRecord = null;
    syncLoggedOutView();
  });
}

function bindAuth() {
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
}

function bindTabs() {
  document.querySelectorAll(".nav-tabs__item").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.target));
  });
}

function bindForms() {
  document.getElementById("collectionForm").addEventListener("submit", handleCollectionSave);
  document.getElementById("collectionResetBtn").addEventListener("click", resetCollectionForm);

  document.getElementById("donationForm").addEventListener("submit", handleDonationSave);
  document.getElementById("donationResetBtn").addEventListener("click", resetDonationForm);

  document.getElementById("eventForm").addEventListener("submit", handleEventSave);
  document.getElementById("eventResetBtn").addEventListener("click", resetEventForm);

  document
    .getElementById("announcementForm")
    .addEventListener("submit", handleAnnouncementSave);
  document
    .getElementById("announcementResetBtn")
    .addEventListener("click", resetAnnouncementForm);

  document.getElementById("requestForm").addEventListener("submit", handleRequestSubmit);
  document.getElementById("requestAadhaarNumber").addEventListener("input", (event) => {
    event.target.value = formatAadhaarNumber(event.target.value);
  });
  document.getElementById("requestCurrentPhotoBtn").addEventListener("click", async () => {
    if (state.memberRecord?.member_photo_path) {
      await openStorageDocument(state.memberRecord.member_photo_path, "Current Member Photo");
    }
  });
  document.getElementById("requestCurrentAadhaarBtn").addEventListener("click", async () => {
    if (state.memberRecord?.aadhar_card_path) {
      await openStorageDocument(state.memberRecord.aadhar_card_path, "Current Aadhaar");
    }
  });
}

function bindSearch() {
  document.getElementById("memberSearch").addEventListener("input", renderMembersList);
}

function bindExportButtons() {
  bindOptionalClick("exportMembersCsvBtn", () => {
    exportRows("csv", "milan-mandir-live-members", getMembersExportRows());
  });
  bindOptionalClick("exportMembersExcelBtn", () => {
    exportRows("excel", "milan-mandir-live-members", getMembersExportRows());
  });
  bindOptionalClick("exportCollectionsCsvBtn", () => {
    exportRows("csv", "milan-mandir-live-monthly-collections", getCollectionsExportRows());
  });
  bindOptionalClick("exportCollectionsExcelBtn", () => {
    exportRows("excel", "milan-mandir-live-monthly-collections", getCollectionsExportRows());
  });
  bindOptionalClick("exportDonationsCsvBtn", () => {
    exportRows("csv", "milan-mandir-live-donations", getDonationsExportRows());
  });
  bindOptionalClick("exportDonationsExcelBtn", () => {
    exportRows("excel", "milan-mandir-live-donations", getDonationsExportRows());
  });
  bindOptionalClick("exportRequestsCsvBtn", () => {
    exportRows("csv", "milan-mandir-live-update-requests", getRequestsExportRows());
  });
  bindOptionalClick("exportRequestsExcelBtn", () => {
    exportRows("excel", "milan-mandir-live-update-requests", getRequestsExportRows());
  });
  bindOptionalClick("exportPendingCsvBtn", () => {
    exportRows("csv", "milan-mandir-live-pending-monthly-payments", getPendingCollectionsExportRows());
  });
  bindOptionalClick("exportPendingExcelBtn", () => {
    exportRows(
      "excel",
      "milan-mandir-live-pending-monthly-payments",
      getPendingCollectionsExportRows()
    );
  });
  bindOptionalClick("exportAuditCsvBtn", () => {
    exportRows("csv", "milan-mandir-admin-audit-log", getAuditExportRows());
  });
  bindOptionalClick("exportAuditExcelBtn", () => {
    exportRows("excel", "milan-mandir-admin-audit-log", getAuditExportRows());
  });
  bindOptionalClick("adminBackupJsonBtn", handleFullBackupDownload);
  bindOptionalClick("adminBackupMembersBtn", handleMembersBackupDownload);
}

function bindOptionalClick(id, handler) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  element.addEventListener("click", handler);
}

function getFilteredMembers() {
  const query = document.getElementById("memberSearch").value.trim().toLowerCase();
  return state.members
    .filter((member) => {
      const address = formatAddress(normalizeAddressFields(member.present_address));
      return [member.full_name, member.member_code, member.phone, address]
        .filter(Boolean)
        .some((value) => `${value}`.toLowerCase().includes(query));
    })
    .sort((left, right) => {
      const leftTime = new Date(left.created_at || 0).getTime();
      const rightTime = new Date(right.created_at || 0).getTime();
      return rightTime - leftTime;
    });
}

function bindFamilyRequestActions() {
  document
    .getElementById("addRequestFamilyMemberBtn")
    .addEventListener("click", () => addRequestFamilyMemberRow());
  renderRequestFamilyMemberRows();
}

async function handleLogin(event) {
  event.preventDefault();
  setAuthMessage("Signing in...");

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setAuthMessage(error.message);
    return;
  }

  if (!data.session) {
    setAuthMessage("Login succeeded, but no session was returned.");
    return;
  }

  nextPreferredTab = "dashboard";
  window.history.replaceState({}, "", "./supabase-index.html");
}

async function handleLogout() {
  setAuthMessage("Signing out...");
  await supabase.auth.signOut();
  syncLoggedOutView();
}

async function hydrateSession(session, preferredTab = null) {
  if (!session?.user?.id) {
    syncLoggedOutView();
    return;
  }

  const sameUser = authHydrationPromise && state.session?.user?.id === session.user.id;

  if (sameUser) {
    return authHydrationPromise;
  }

  authHydrationPromise = (async () => {
    state.session = session;
    setAuthMessage(`Loading profile for ${session.user.email || session.user.id}...`);

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (error) {
      throw new Error(`Could not load profile: ${error.message}`);
    }

    state.profile = profile;
    syncLoggedInShell();
    configureRoleVisibility();

    await loadData();
    renderAll();
    activateTab(preferredTab || getDefaultTab());
    setAuthMessage("");
  })();

  try {
    await authHydrationPromise;
  } catch (error) {
    authHydrationPromise = null;
    throw error;
  }
}

function syncLoggedInShell() {
  document.getElementById("authShell").classList.add("is-hidden");
  document.getElementById("appShell").classList.remove("is-hidden");
  document.getElementById("currentUserLabel").textContent =
    state.profile?.full_name || state.session?.user?.email || "Logged in";
  document.getElementById("currentRoleLabel").textContent = isAdmin()
    ? "Admin access"
    : "Member access";
}

function syncLoggedOutView() {
  document.getElementById("authShell").classList.remove("is-hidden");
  document.getElementById("appShell").classList.add("is-hidden");
  document.getElementById("loginForm").reset();
}

function configureRoleVisibility() {
  const admin = isAdmin();
  document.querySelectorAll("[data-role]").forEach((element) => {
    const role = element.dataset.role;
    element.classList.toggle("is-hidden", role === "admin" ? !admin : admin);
  });

  toggleElementDisplay(document.getElementById("collectionsFormCard"), admin);
  toggleElementDisplay(document.getElementById("eventsFormCard"), admin);
  toggleElementDisplay(document.getElementById("announcementsFormCard"), admin);
  toggleElementDisplay(document.getElementById("requestForm").closest(".content-card"), !admin);

  document.getElementById("requestsPageTitle").textContent = admin
    ? "Member Update Requests"
    : "Send Profile Update Request";
  document.getElementById("requestsListTitle").textContent = admin
    ? "All Requests"
    : "My Requests";
  document.getElementById("collectionsListTitle").textContent = admin
    ? "Collection Records"
    : "My Collection Records";

  if (!admin && getActiveTabButton()?.dataset.role === "admin") {
    activateTab(getDefaultTab());
  }
}

function getDefaultTab() {
  const requestedTab = new URLSearchParams(window.location.search).get("tab");
  const allowed = isAdmin()
    ? [
        "dashboard",
        "members",
        "collections",
        "donations",
        "events",
        "announcements",
        "requests",
        "audit",
      ]
    : ["dashboard", "collections", "events", "announcements", "requests", "profile"];

  if (requestedTab && allowed.includes(requestedTab)) {
    return requestedTab;
  }

  return "dashboard";
}

function activateTab(target) {
  document.querySelectorAll(".nav-tabs__item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.target === target);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === target);
  });
}

function getActiveTabButton() {
  return document.querySelector(".nav-tabs__item.is-active");
}

async function loadData() {
  if (!state.profile) {
    return;
  }

  if (isAdmin()) {
    const [
      membersResult,
      collectionsResult,
      donationsResult,
      eventsResult,
      announcementsResult,
      requestsResult,
      auditLogsResult,
    ] = await Promise.all([
      supabase.from("members").select("*").order("created_at", { ascending: false }),
      supabase.from("collections").select("*").order("month_key", { ascending: false }),
      supabase.from("donations").select("*").order("donation_date", { ascending: false }),
      supabase.from("events").select("*").order("event_date", { ascending: false }),
      supabase.from("announcements").select("*").order("announcement_date", { ascending: false }),
      supabase.from("member_update_requests").select("*").order("created_at", { ascending: false }),
      loadAdminAuditLogs(),
    ]);

    ensureQuerySuccess(membersResult, "members");
    ensureQuerySuccess(collectionsResult, "collections");
    ensureQuerySuccess(donationsResult, "donations");
    ensureQuerySuccess(eventsResult, "events");
    ensureQuerySuccess(announcementsResult, "announcements");
    ensureQuerySuccess(requestsResult, "member update requests");

    state.members = membersResult.data || [];
    state.collections = collectionsResult.data || [];
    state.donations = donationsResult.data || [];
    state.events = eventsResult.data || [];
    state.announcements = announcementsResult.data || [];
    state.requests = requestsResult.data || [];
    state.auditLogs = auditLogsResult.data || [];
    state.auditLogsError = auditLogsResult.error?.message || "";
    state.memberRecord = null;
    return;
  }

  const [memberResult, collectionsResult, eventsResult, announcementsResult, requestsResult] =
    await Promise.all([
      supabase.from("members").select("*").eq("auth_user_id", state.session.user.id).maybeSingle(),
      supabase.from("collections").select("*").order("month_key", { ascending: false }),
      supabase.from("events").select("*").order("event_date", { ascending: false }),
      supabase.from("announcements").select("*").order("announcement_date", { ascending: false }),
      supabase
        .from("member_update_requests")
        .select("*")
        .eq("requested_by", state.session.user.id)
        .order("created_at", { ascending: false }),
    ]);

  ensureQuerySuccess(memberResult, "member profile");
  ensureQuerySuccess(collectionsResult, "collections");
  ensureQuerySuccess(eventsResult, "events");
  ensureQuerySuccess(announcementsResult, "announcements");
  ensureQuerySuccess(requestsResult, "member update requests");

  state.memberRecord = memberResult.data || null;
  state.members = state.memberRecord ? [state.memberRecord] : [];
  state.collections = collectionsResult.data || [];
  state.donations = [];
  state.events = eventsResult.data || [];
  state.announcements = announcementsResult.data || [];
  state.requests = requestsResult.data || [];
  state.auditLogs = [];
  state.auditLogsError = "";
}

function ensureQuerySuccess(result, label) {
  if (result.error) {
    throw new Error(`Could not load ${label}: ${result.error.message}`);
  }
}

async function loadAdminAuditLogs() {
  const result = await supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (
    result.error &&
    /admin_audit_logs|Could not find the table|relation .* does not exist/i.test(
      result.error.message || ""
    )
  ) {
    return {
      data: [],
      error: {
          message:
            "Audit log table is not set up yet. Run the admin audit setup SQL once.",
      },
    };
  }

  return result;
}

function renderAll() {
  renderStats();
  renderDashboard();
  renderMembersList();
  renderMemberSelect();
  renderCollections();
  renderDonations();
  renderEvents();
  renderAnnouncements();
  renderRequests();
  renderAuditLog();
  renderProfile();
  prefillRequestForm();
}

function renderStats() {
  const statsGrid = document.getElementById("statsGrid");
  const currentMonth = getCurrentMonthKey();
  const paidMemberIdsThisMonth = getPaidMemberIdsForMonth(currentMonth);

  const stats = isAdmin()
    ? [
        ["Registered Members", state.members.length],
        ["Paid This Month", paidMemberIdsThisMonth.size],
        [
          "Not Paid This Month",
          Math.max(state.members.length - paidMemberIdsThisMonth.size, 0),
        ],
        [
          "Pending Update Requests",
          state.requests.filter((request) => request.status === "Pending").length,
        ],
      ]
    : [
        ["My Collections", state.collections.length],
        [
          "Paid This Month",
          state.collections.filter(
            (collection) =>
              collection.month_key === currentMonth && collection.status === "Paid"
          ).length,
        ],
        ["My Requests", state.requests.length],
        [
          "Active Announcements",
          state.announcements.filter((item) => item.status === "Active").length,
        ],
      ];

  statsGrid.innerHTML = stats
    .map(
      ([label, value]) => `<article><p>${escapeHtml(label)}</p><strong>${escapeHtml(
        String(value)
      )}</strong></article>`
    )
    .join("");
}

function renderDashboard() {
  if (isAdmin()) {
    renderAdminDashboard();
    return;
  }

  renderMemberDashboard();
}

function renderAdminDashboard() {
  const currentMonth = getCurrentMonthKey();
  const previousMonth = getRelativeMonthKey(-1);
  const pendingRequests = state.requests.filter((request) => request.status === "Pending");
  const allRequests = state.requests
    .slice()
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));
  const pendingPayments = getPendingPaymentSummary(currentMonth, previousMonth);
  const monthlyFinanceSummary = getMonthlyFinanceSummary();

  document.getElementById("dashboardEyebrow").textContent = "Overview";
  document.getElementById("dashboardPageTitle").textContent = "Mandir Operations Dashboard";
  document.getElementById("dashboardPrimaryCardTitle").textContent = "Update Requests Received";
  document.getElementById("dashboardPrimaryCardMeta").textContent = allRequests.length
    ? `${pendingRequests.length} pending request(s)`
    : "No requests received yet";
  document.getElementById("dashboardSideCardTitle").textContent = "Pending Monthly Payments";
  document.getElementById("dashboardMonthlySummaryCard").classList.remove("is-hidden");
  document.getElementById("dashboardMonthlySummaryTitle").textContent =
    "Last 6 Months Financial Summary";
  document.getElementById("dashboardMonthlySummaryMeta").textContent =
    "Monthly collection and donation totals";

  const primaryContent = document.getElementById("dashboardPrimaryContent");
  primaryContent.innerHTML = allRequests.length
    ? allRequests
        .map((request) => renderRequestCard(request, true))
        .join("")
    : `<div class="empty-state">No update requests have been received from members yet.</div>`;

  const recentActivity = document.getElementById("recentActivity");
  recentActivity.innerHTML = pendingPayments.length
    ? pendingPayments
        .map(
          (item) => `
            <li>
              <strong>${escapeHtml(item.name)}</strong>
              <div class="record-meta">
                Current month: ${item.currentMonthPending ? "Pending" : "Paid / No pending record"}<br />
                Previous month: ${item.previousMonthPending ? "Pending" : "Paid / No pending record"}<br />
                Total pending months: ${escapeHtml(String(item.totalPendingMonths))}
              </div>
            </li>
          `
        )
        .join("")
    : `<li class="empty-state">No pending monthly payment record found for the current or previous month.</li>`;

  document.getElementById("dashboardMonthlySummaryList").innerHTML = monthlyFinanceSummary
    .map(
      (item) => `
        <article class="record-item">
          <div class="record-title">
            <strong>${escapeHtml(item.label)}</strong>
          </div>
          <div class="record-tags">
            <button type="button" class="tag tag-button dashboard-detail-btn" data-month="${escapeAttribute(
              item.key
            )}" data-type="collections">
              All Collections ${escapeHtml(formatCurrency(item.collectionTotal))}
            </button>
            <button type="button" class="tag tag-button dashboard-detail-btn" data-month="${escapeAttribute(
              item.key
            )}" data-type="donations">
              Donations ${escapeHtml(formatCurrency(item.donationTotal))}
            </button>
          </div>
          <div class="record-meta">
            Total collection received in ${escapeHtml(item.label)}: ${escapeHtml(
              formatCurrency(item.collectionTotal)
            )}<br />
            Total donation received in ${escapeHtml(item.label)}: ${escapeHtml(
              formatCurrency(item.donationTotal)
            )}<br />
            Collection record(s): ${escapeHtml(String(item.collectionCount))} |
            Donation record(s): ${escapeHtml(String(item.donationCount))}
          </div>
        </article>
      `
    )
    .join("");

  bindRequestButtons(primaryContent);
  bindDashboardDetailButtons();
  renderDashboardDetail();
}

function renderMemberDashboard() {
  document.getElementById("dashboardEyebrow").textContent = "Member Overview";
  document.getElementById("dashboardPageTitle").textContent = "Member Dashboard";
  document.getElementById("dashboardPrimaryCardTitle").textContent = "My Collections";
  document.getElementById("dashboardSideCardTitle").textContent = "Latest Announcements";
  document.getElementById("dashboardPrimaryCardMeta").textContent = `${state.collections.length} collection record(s)`;
  document.getElementById("dashboardMonthlySummaryCard").classList.add("is-hidden");

  document.getElementById("dashboardPrimaryContent").innerHTML = state.collections.length
    ? state.collections
        .slice(0, 6)
        .map((collection) => renderCollectionCard(collection, false))
        .join("")
    : `<div class="empty-state">No collection records available.</div>`;

  document.getElementById("recentActivity").innerHTML = state.announcements.length
    ? state.announcements
        .slice(0, 6)
        .map(
          (item) => `
            <li>
              <strong>${escapeHtml(item.title)}</strong>
              <div class="record-meta">
                ${escapeHtml(formatDate(item.announcement_date))}<br />
                ${escapeHtml(item.message || "No announcement details available.")}
              </div>
            </li>
          `
        )
        .join("")
    : `<li class="empty-state">No active announcements.</li>`;

  bindCollectionButtons(document.getElementById("dashboardPrimaryContent"));
}

function getRelativeMonthKey(offset) {
  const [year, month] = getCurrentMonthKey().split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey) {
  const [year, month] = `${monthKey}`.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, (month || 1) - 1, 1));
}

function getPaidMemberIdsForMonth(monthKey) {
  return new Set(
    state.collections
      .filter(
        (collection) =>
          collection.month_key === monthKey &&
          collection.status === "Paid" &&
          collection.member_id
      )
      .map((collection) => collection.member_id)
  );
}

function getPendingPaymentSummary(currentMonth, previousMonth) {
  return state.members
    .map((member) => {
      const memberCollections = state.collections.filter(
        (collection) => collection.member_id === member.id
      );
      const currentMonthStatus = getMonthPaymentStatus(memberCollections, currentMonth);
      const previousMonthStatus = getMonthPaymentStatus(memberCollections, previousMonth);
      const pendingMonthKeys = new Set(
        memberCollections
          .filter((collection) => collection.status !== "Paid" && collection.month_key)
          .map((collection) => collection.month_key)
      );

      if (currentMonthStatus === "Pending") {
        pendingMonthKeys.add(currentMonth);
      }

      if (previousMonthStatus === "Pending") {
        pendingMonthKeys.add(previousMonth);
      }

      return {
        id: member.id,
        name: member.full_name,
        memberCode: member.member_code,
        phone: member.phone,
        currentMonthPending: currentMonthStatus === "Pending",
        previousMonthPending: previousMonthStatus === "Pending",
        totalPendingMonths: pendingMonthKeys.size,
      };
    })
    .filter((item) => item.currentMonthPending || item.previousMonthPending)
    .sort((left, right) => right.totalPendingMonths - left.totalPendingMonths);
}

function getMonthPaymentStatus(memberCollections, monthKey) {
  const monthCollections = memberCollections.filter(
    (collection) => collection.month_key === monthKey
  );

  if (!monthCollections.length) {
    return "Pending";
  }

  return monthCollections.some((collection) => collection.status === "Paid")
    ? "Paid"
    : "Pending";
}

function getMonthlyFinanceSummary() {
  const monthKeys = Array.from({ length: 6 }, (_, index) => getRelativeMonthKey(-index));
  return monthKeys.map((monthKey) => {
    const collections = state.collections.filter((item) => item.month_key === monthKey);
    const donations = state.donations.filter(
      (item) => `${item.donation_date || ""}`.slice(0, 7) === monthKey
    );

    return {
      key: monthKey,
      label: formatMonthLabel(monthKey),
      collectionTotal: collections.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      donationTotal: donations.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      collectionCount: collections.length,
      donationCount: donations.length,
    };
  });
}

function renderMembersList() {
  const container = document.getElementById("membersList");
  if (!isAdmin()) {
    container.innerHTML = `<div class="empty-state">Members list is available for admins only.</div>`;
    return;
  }

  const filtered = getFilteredMembers();

  container.innerHTML = filtered.length
    ? filtered.map((member) => renderMemberCard(member, true, false, true)).join("")
    : `<div class="empty-state">No members match this search.</div>`;

  bindMemberButtons(container);
}

function renderMemberSelect() {
  const select = document.getElementById("collectionMember");
  if (!select) {
    return;
  }

  const options = state.members
    .map(
      (member) =>
        `<option value="${escapeAttribute(member.id)}">${escapeHtml(
          `${member.full_name} (${member.member_code})`
        )}</option>`
    )
    .join("");

  select.innerHTML = `<option value="">Select member</option>${options}`;
}

function renderCollections() {
  const list = document.getElementById("collectionsList");
  const records = isAdmin()
    ? state.collections
    : state.collections.filter(
        (collection) => collection.member_id === state.memberRecord?.id || !state.memberRecord
      );

  list.innerHTML = records.length
    ? records.map((collection) => renderCollectionCard(collection, isAdmin())).join("")
    : `<div class="empty-state">No collection records found.</div>`;

  bindCollectionButtons(list);
}

function renderDonations() {
  const list = document.getElementById("donationsList");
  if (!isAdmin()) {
    list.innerHTML = `<div class="empty-state">Donation management is available for admins only.</div>`;
    return;
  }

  list.innerHTML = state.donations.length
    ? state.donations.map((donation) => renderDonationCard(donation)).join("")
    : `<div class="empty-state">No donation records found.</div>`;

  bindDonationButtons(list);
}

function renderEvents() {
  const list = document.getElementById("eventsList");
  list.innerHTML = state.events.length
    ? state.events.map((event) => renderEventCard(event, isAdmin())).join("")
    : `<div class="empty-state">No events available.</div>`;

  bindEventButtons(list);
}

function renderAnnouncements() {
  const list = document.getElementById("announcementsList");
  list.innerHTML = state.announcements.length
    ? state.announcements
        .filter((item) => (isAdmin() ? true : item.status === "Active"))
        .map((item) => renderAnnouncementCard(item, isAdmin()))
        .join("")
    : `<div class="empty-state">No announcements available.</div>`;

  bindAnnouncementButtons(list);
}

function renderRequests() {
  const list = document.getElementById("requestsList");
  list.innerHTML = state.requests.length
    ? state.requests.map((request) => renderRequestCard(request, isAdmin())).join("")
    : `<div class="empty-state">No update requests found.</div>`;

  bindRequestButtons(list);
}

function renderAuditLog() {
  const list = document.getElementById("auditLogList");
  const meta = document.getElementById("auditLogMeta");

  if (!list || !meta) {
    return;
  }

  if (!isAdmin()) {
    list.innerHTML = `<div class="empty-state">Audit log is available for admins only.</div>`;
    meta.textContent = "Track important admin changes, approvals, and backups.";
    return;
  }

  if (state.auditLogsError) {
    list.innerHTML = `<div class="empty-state">${escapeHtml(state.auditLogsError)}</div>`;
    meta.textContent = "Run the audit setup SQL once, then refresh this page.";
    return;
  }

  meta.textContent = state.auditLogs.length
    ? `${state.auditLogs.length} recent admin action(s)`
    : "No admin actions have been recorded yet.";

  list.innerHTML = state.auditLogs.length
    ? state.auditLogs.map((entry) => renderAuditLogCard(entry)).join("")
    : `<div class="empty-state">No admin actions have been recorded yet.</div>`;
}

function renderAuditLogCard(entry) {
  const details = formatAuditDetails(entry.details);
  return `
    <article class="record-item">
      <div class="record-title">
        <strong>${escapeHtml(entry.summary || "Admin action")}</strong>
        <span class="tag">${escapeHtml(entry.action_type || "action")}</span>
      </div>
      <div class="record-meta">
        ${escapeHtml(entry.actor_name || entry.actor_email || "Unknown admin")}<br />
        ${escapeHtml(formatDateTime(entry.created_at))}<br />
        Entity: ${escapeHtml(entry.entity_type || "Unknown")}
        ${entry.entity_id ? ` | ID: ${escapeHtml(entry.entity_id)}` : ""}
      </div>
      ${details ? `<div class="record-meta">${details}</div>` : ""}
    </article>
  `;
}

function formatAuditDetails(details) {
  if (!details || typeof details !== "object") {
    return "";
  }

  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 6)
    .map(([key, value]) => `${humanizeAuditKey(key)}: ${formatAuditValue(value)}`)
    .join("<br />");
}

function humanizeAuditKey(key) {
  return `${key || ""}`
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatAuditValue(value) {
  if (Array.isArray(value)) {
    return escapeHtml(value.join(", "));
  }

  if (typeof value === "object") {
    return escapeHtml(JSON.stringify(value));
  }

  return escapeHtml(String(value));
}

function renderProfile() {
  const profileCard = document.getElementById("profileCard");
  if (!state.memberRecord) {
    profileCard.innerHTML = `<div class="empty-state">No linked member profile found for this login.</div>`;
    return;
  }

  profileCard.innerHTML = renderMemberCard(state.memberRecord, false, true);
  bindMemberButtons(profileCard);
}

function renderMemberCard(member, adminActions = false, compact = false, allowDelete = false) {
  const presentAddress = formatAddress(normalizeAddressFields(member.present_address));
  const permanentAddress = formatAddress(normalizeAddressFields(member.permanent_address));
  const familyDetails = formatFamilyDetails(member.family_members);
  const photo = member.member_photo_path
    ? `<img
        class="member-photo-thumb member-photo-preview is-hidden"
        data-path="${escapeAttribute(member.member_photo_path)}"
        data-label="Member Photo"
        alt="${escapeAttribute(`${member.full_name} photo`)}"
      />`
    : "";

  const actions = adminActions
    ? `<div class="record-actions">
        <a class="ghost-button ghost-button--small" href="./supabase-member-registration.html?memberId=${encodeURIComponent(
          member.id
        )}">Edit</a>
        ${
          allowDelete
            ? `<button type="button" class="ghost-button ghost-button--small member-delete-btn" data-id="${escapeAttribute(
                member.id
              )}" data-name="${escapeAttribute(member.full_name)}">Delete Member</button>`
            : ""
        }
        ${member.member_photo_path ? `<button type="button" class="ghost-button ghost-button--small member-doc-btn" data-path="${escapeAttribute(member.member_photo_path)}" data-label="Member Photo">Photo</button>` : ""}
        ${member.aadhar_card_path ? `<button type="button" class="ghost-button ghost-button--small member-doc-btn" data-path="${escapeAttribute(member.aadhar_card_path)}" data-label="Aadhaar Card">Aadhaar</button>` : ""}
      </div>`
    : `<div class="record-actions">
        ${member.member_photo_path ? `<button type="button" class="ghost-button ghost-button--small member-doc-btn" data-path="${escapeAttribute(member.member_photo_path)}" data-label="Member Photo">View Photo</button>` : ""}
        ${member.aadhar_card_path ? `<button type="button" class="ghost-button ghost-button--small member-doc-btn" data-path="${escapeAttribute(member.aadhar_card_path)}" data-label="Aadhaar Card">View Aadhaar</button>` : ""}
      </div>`;

  return `
    <article class="record-item">
      <div class="member-media">
        ${photo}
        <div class="member-details">
          <div class="section-heading">
            <div>
              <strong>${escapeHtml(member.full_name)}</strong>
              <div class="record-meta">${escapeHtml(member.member_code || "Member code pending")}</div>
            </div>
            ${actions}
          </div>
          <div class="record-meta">
            ${escapeHtml(member.phone || "Phone not set")}
            ${member.occupation ? ` | ${escapeHtml(member.occupation)}` : ""}
            ${member.auth_user_id ? ` | Login linked` : ` | Login not linked`}
          </div>
          ${compact ? "" : `<div class="record-meta">DOB: ${escapeHtml(formatDate(member.dob))}</div>`}
          <div class="record-meta">Present: ${escapeHtml(presentAddress || "Not set")}</div>
          <div class="record-meta">Permanent: ${escapeHtml(permanentAddress || "Not set")}</div>
          <div class="record-meta">Family: ${escapeHtml(familyDetails)}</div>
          <div class="record-meta">Email: ${escapeHtml(member.email || "Not set")}</div>
        </div>
      </div>
    </article>
  `;
}

function renderCollectionCard(collection, adminActions) {
  const actions = [];

  if (adminActions) {
    actions.push(
      `<button type="button" class="ghost-button ghost-button--small collection-edit-btn" data-id="${escapeAttribute(
        collection.id
      )}">Edit</button>`
    );
  }

  if (collection.status === "Paid") {
    actions.push(
      `<button type="button" class="ghost-button ghost-button--small collection-receipt-btn" data-id="${escapeAttribute(
        collection.id
      )}">Download Receipt</button>`
    );
  }

  return `
    <article class="record-item">
      <div class="section-heading">
        <div>
          <strong>${escapeHtml(collection.member_name || collection.member_code || "Member")}</strong>
          <div class="record-meta">${escapeHtml(collection.month_key)}</div>
        </div>
        <div class="record-actions">${actions.join("")}</div>
      </div>
      <div class="record-meta">${escapeHtml(collection.member_code || "")}</div>
      <div class="record-meta">${escapeHtml(collection.status)} | ${escapeHtml(
        formatCurrency(collection.amount)
      )}</div>
      <div class="record-meta">Payment Date: ${escapeHtml(formatDate(collection.payment_date))}</div>
      <div class="record-meta">Remarks: ${escapeHtml(collection.remarks || "None")}</div>
    </article>
  `;
}

function renderDonationCard(donation) {
  return `
    <article class="record-item">
      <div class="section-heading">
        <div>
          <strong>${escapeHtml(donation.donor_name)}</strong>
          <div class="record-meta">${escapeHtml(formatCurrency(donation.amount))}</div>
        </div>
        <div class="record-actions">
          <button type="button" class="ghost-button ghost-button--small donation-edit-btn" data-id="${escapeAttribute(
            donation.id
          )}">Edit</button>
        </div>
      </div>
      <div class="record-meta">${escapeHtml(donation.donor_phone || "No contact number")}</div>
      <div class="record-meta">${escapeHtml(formatDate(donation.donation_date))}</div>
      <div class="record-meta">${escapeHtml(donation.purpose || "No purpose entered")}</div>
      <div class="record-meta">${escapeHtml(donation.notes || "No notes")}</div>
    </article>
  `;
}

function renderEventCard(event, adminActions) {
  return `
    <article class="record-item">
      <div class="section-heading">
        <div>
          <strong>${escapeHtml(event.title)}</strong>
          <div class="record-meta">${escapeHtml(formatDate(event.event_date))}</div>
        </div>
        ${
          adminActions
            ? `<div class="record-actions">
                <button type="button" class="ghost-button ghost-button--small event-edit-btn" data-id="${escapeAttribute(
                  event.id
                )}">Edit</button>
              </div>`
            : ""
        }
      </div>
      <div class="record-meta">Venue: ${escapeHtml(event.venue)}</div>
      <div class="record-meta">Coordinator: ${escapeHtml(event.coordinator || "Not set")}</div>
      <div class="record-meta">${escapeHtml(event.description || "No description")}</div>
    </article>
  `;
}

function renderAnnouncementCard(item, adminActions) {
  return `
    <article class="record-item">
      <div class="section-heading">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <div class="record-meta">${escapeHtml(item.category)} | ${escapeHtml(item.status)}</div>
        </div>
        ${
          adminActions
            ? `<div class="record-actions">
                <button type="button" class="ghost-button ghost-button--small announcement-edit-btn" data-id="${escapeAttribute(
                  item.id
                )}">Edit</button>
              </div>`
            : ""
        }
      </div>
      <div class="record-meta">${escapeHtml(formatDate(item.announcement_date))}</div>
      <div class="record-meta">${escapeHtml(item.message)}</div>
    </article>
  `;
}

function renderRequestCard(request, adminActions) {
  const proposed = request.proposed_data || {};
  const currentMember = state.members.find((member) => member.id === request.member_id) || null;
  const changeSummary = summarizeRequestChanges(currentMember, proposed);
  const actions =
    adminActions && request.status === "Pending"
      ? `<div class="record-actions">
          <button type="button" class="ghost-button ghost-button--small request-approve-btn" data-id="${escapeAttribute(
            request.id
          )}">Approve</button>
          <button type="button" class="ghost-button ghost-button--small request-reject-btn" data-id="${escapeAttribute(
            request.id
          )}">Reject</button>
        </div>`
      : "";

  return `
    <article class="record-item">
      <div class="section-heading">
        <div>
          <strong>${escapeHtml(proposed.full_name || request.member_code || "Member update request")}</strong>
          <div class="record-meta">${escapeHtml(request.status)}</div>
        </div>
        ${actions}
      </div>
      <div class="record-meta">Member Code: ${escapeHtml(request.member_code || "Not set")}</div>
      <div class="record-meta">Requested: ${escapeHtml(formatDateTime(request.created_at))}</div>
      <div class="record-meta">Phone: ${escapeHtml(proposed.phone || "Not set")}</div>
      <div class="record-meta">Address: ${escapeHtml(
        formatAddress(normalizeAddressFields(proposed.present_address))
      )}</div>
      <div class="record-meta">Family: ${escapeHtml(formatFamilyDetails(proposed.family_members))}</div>
      <div class="record-meta"><strong>Requested changes:</strong> ${escapeHtml(changeSummary)}</div>
      <div class="record-actions">
        ${
          proposed.member_photo_path
            ? `<button type="button" class="ghost-button ghost-button--small request-doc-btn" data-path="${escapeAttribute(
                proposed.member_photo_path
              )}" data-label="Requested Member Photo">Requested Photo</button>`
            : ""
        }
        ${
          proposed.aadhar_card_path
            ? `<button type="button" class="ghost-button ghost-button--small request-doc-btn" data-path="${escapeAttribute(
                proposed.aadhar_card_path
              )}" data-label="Requested Aadhaar Document">Requested Aadhaar</button>`
            : ""
        }
      </div>
    </article>
  `;
}

function summarizeRequestChanges(currentMember, proposed) {
  if (!currentMember) {
    return "Current member record not available for comparison.";
  }

  const changes = [];
  const pushChange = (label, currentValue, proposedValue) => {
    const currentText = normalizeComparisonValue(currentValue);
    const proposedText = normalizeComparisonValue(proposedValue);
    if (currentText !== proposedText) {
      changes.push(`${label}: ${currentText || "Not set"} -> ${proposedText || "Not set"}`);
    }
  };

  pushChange("Full Name", currentMember.full_name, proposed.full_name);
  pushChange("Gender", currentMember.gender, proposed.gender);
  pushChange("Phone", currentMember.phone, proposed.phone);
  pushChange("Email", currentMember.email, proposed.email);
  pushChange("Occupation", currentMember.occupation, proposed.occupation);
  pushChange("Date of Birth", formatDateForComparison(currentMember.dob), formatDateForComparison(proposed.dob));
  pushChange("Aadhaar Number", currentMember.aadhar_number, proposed.aadhar_number);
  if (normalizeComparisonValue(proposed.member_photo_path) && proposed.member_photo_path !== currentMember.member_photo_path) {
    changes.push("Member Photo: update requested");
  }
  if (normalizeComparisonValue(proposed.aadhar_card_path) && proposed.aadhar_card_path !== currentMember.aadhar_card_path) {
    changes.push("Aadhaar Document: update requested");
  }
  pushChange(
    "Present Address",
    formatAddress(normalizeAddressFields(currentMember.present_address)),
    formatAddress(normalizeAddressFields(proposed.present_address))
  );
  pushChange(
    "Permanent Address",
    formatAddress(normalizeAddressFields(currentMember.permanent_address)),
    formatAddress(normalizeAddressFields(proposed.permanent_address))
  );
  pushChange(
    "Family Details",
    formatFamilyDetails(currentMember.family_members),
    formatFamilyDetails(proposed.family_members)
  );

  return changes.length ? changes.join(" | ") : "No field differences detected.";
}

function normalizeComparisonValue(value) {
  return `${value || ""}`.trim();
}

function formatDateForComparison(value) {
  return value ? `${value}`.slice(0, 10) : "";
}

function bindMemberButtons(container) {
  container.querySelectorAll(".member-photo-preview").forEach(async (image) => {
    const { data, error } = await supabase.storage
      .from(storageBucket)
      .createSignedUrl(image.dataset.path, 60);

    if (error || !data?.signedUrl) {
      image.remove();
      return;
    }

    image.src = data.signedUrl;
    image.classList.remove("is-hidden");
  });

  container.querySelectorAll(".member-doc-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      await openStorageDocument(button.dataset.path, button.dataset.label);
    });
  });

  container.querySelectorAll(".member-delete-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      await handleMemberDelete(button.dataset.id, button.dataset.name);
    });
  });
}

async function handleMemberDelete(memberId, memberName) {
  if (!isAdmin()) {
    return;
  }

  const member = state.members.find((item) => item.id === memberId);
  if (!member) {
    setAuthMessage("Could not find that member record.");
    return;
  }

  if (member.auth_user_id === state.session?.user?.id) {
    setAuthMessage("You cannot delete the member record linked to your current login.");
    return;
  }

  await downloadMemberSafetyBackup(member);

  const confirmed = window.confirm(
    `Delete member "${memberName}"? A safety backup has already been downloaded. This will remove the member record, collection history, and pending requests.`
  );
  if (!confirmed) {
    return;
  }

  setAuthMessage(`Deleting ${memberName}...`);

  const folderPath = `members/${member.id}`;
  const { data: storageItems, error: storageListError } = await supabase.storage
    .from(storageBucket)
    .list(folderPath, { limit: 100 });

  if (!storageListError && storageItems?.length) {
    const pathsToRemove = storageItems
      .filter((item) => item.name)
      .map((item) => `${folderPath}/${item.name}`);

    if (pathsToRemove.length) {
      await supabase.storage.from(storageBucket).remove(pathsToRemove);
    }
  }

  if (member.auth_user_id) {
    await supabase.from("profiles").delete().eq("id", member.auth_user_id);
  }

  const { error } = await supabase.from("members").delete().eq("id", member.id);
  if (error) {
    setAuthMessage(`Could not delete member: ${error.message}`);
    return;
  }

  await writeAdminAuditLog({
    actionType: "member_deleted",
    entityType: "member",
    entityId: member.id,
    summary: `Deleted member ${memberName}`,
    details: {
      member_code: member.member_code,
      phone: member.phone,
      email: member.email,
      had_linked_login: Boolean(member.auth_user_id),
    },
  });

  await loadData();
  renderAll();
  setAuthMessage(`${memberName} was deleted successfully.`);
}

async function handleFullBackupDownload() {
  if (!isAdmin()) {
    return;
  }

  setAdminBackupMessage("Preparing full backup...");

  const [
    profilesResult,
    membersResult,
    collectionsResult,
    donationsResult,
    eventsResult,
    announcementsResult,
    requestsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    supabase.from("members").select("*").order("created_at", { ascending: true }),
    supabase.from("collections").select("*").order("created_at", { ascending: true }),
    supabase.from("donations").select("*").order("created_at", { ascending: true }),
    supabase.from("events").select("*").order("created_at", { ascending: true }),
    supabase.from("announcements").select("*").order("created_at", { ascending: true }),
    supabase.from("member_update_requests").select("*").order("created_at", { ascending: true }),
  ]);

  try {
    ensureQuerySuccess(profilesResult, "profiles backup");
    ensureQuerySuccess(membersResult, "members backup");
    ensureQuerySuccess(collectionsResult, "collections backup");
    ensureQuerySuccess(donationsResult, "donations backup");
    ensureQuerySuccess(eventsResult, "events backup");
    ensureQuerySuccess(announcementsResult, "announcements backup");
    ensureQuerySuccess(requestsResult, "update requests backup");
  } catch (error) {
    setAdminBackupMessage(error.message || "Could not generate full backup.");
    return;
  }

  const backup = {
    exportedAt: new Date().toISOString(),
    projectUrl: supabase.supabaseUrl,
    exportedBy: {
      id: state.session?.user?.id || "",
      email: state.session?.user?.email || "",
      role: state.profile?.role || "",
      fullName: state.profile?.full_name || "",
    },
    counts: {
      profiles: profilesResult.data?.length || 0,
      members: membersResult.data?.length || 0,
      collections: collectionsResult.data?.length || 0,
      donations: donationsResult.data?.length || 0,
      events: eventsResult.data?.length || 0,
      announcements: announcementsResult.data?.length || 0,
      memberUpdateRequests: requestsResult.data?.length || 0,
    },
    data: {
      profiles: profilesResult.data || [],
      members: membersResult.data || [],
      collections: collectionsResult.data || [],
      donations: donationsResult.data || [],
      events: eventsResult.data || [],
      announcements: announcementsResult.data || [],
      member_update_requests: requestsResult.data || [],
    },
  };

  downloadFile(
    `milan-mandir-full-backup-${getTodayIso()}.json`,
    "application/json;charset=utf-8;",
    JSON.stringify(backup, null, 2)
  );
  await writeAdminAuditLog({
    actionType: "backup_downloaded",
    entityType: "system",
    entityId: "full-backup",
    summary: "Downloaded full system backup",
    details: backup.counts,
  });
  setAdminBackupMessage("Full backup downloaded successfully.");
}

async function handleMembersBackupDownload() {
  if (!isAdmin()) {
    return;
  }

  setAdminBackupMessage("Preparing members backup...");

  const [profilesResult, membersResult, requestsResult] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    supabase.from("members").select("*").order("created_at", { ascending: true }),
    supabase.from("member_update_requests").select("*").order("created_at", { ascending: true }),
  ]);

  try {
    ensureQuerySuccess(profilesResult, "profiles backup");
    ensureQuerySuccess(membersResult, "members backup");
    ensureQuerySuccess(requestsResult, "update requests backup");
  } catch (error) {
    setAdminBackupMessage(error.message || "Could not generate members backup.");
    return;
  }

  const backup = {
    exportedAt: new Date().toISOString(),
    exportedBy: state.session?.user?.email || "",
    data: {
      profiles: profilesResult.data || [],
      members: membersResult.data || [],
      member_update_requests: requestsResult.data || [],
    },
  };

  downloadFile(
    `milan-mandir-members-backup-${getTodayIso()}.json`,
    "application/json;charset=utf-8;",
    JSON.stringify(backup, null, 2)
  );
  await writeAdminAuditLog({
    actionType: "backup_downloaded",
    entityType: "system",
    entityId: "members-backup",
    summary: "Downloaded members backup",
    details: {
      profiles: profilesResult.data?.length || 0,
      members: membersResult.data?.length || 0,
      member_update_requests: requestsResult.data?.length || 0,
    },
  });
  setAdminBackupMessage("Members backup downloaded successfully.");
}

async function downloadMemberSafetyBackup(member) {
  const [profileResult, collectionsResult, requestsResult] = await Promise.all([
    member.auth_user_id
      ? supabase.from("profiles").select("*").eq("id", member.auth_user_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("collections").select("*").eq("member_id", member.id).order("created_at", {
      ascending: true,
    }),
    supabase
      .from("member_update_requests")
      .select("*")
      .eq("member_id", member.id)
      .order("created_at", { ascending: true }),
  ]);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    exportedBy: state.session?.user?.email || "",
    member,
    linkedProfile: profileResult.data || null,
    collections: collectionsResult.data || [],
    updateRequests: requestsResult.data || [],
  };

  downloadFile(
    `milan-mandir-member-safety-backup-${member.member_code || member.id}-${getTodayIso()}.json`,
    "application/json;charset=utf-8;",
    JSON.stringify(snapshot, null, 2)
  );
}

async function writeAdminAuditLog({ actionType, entityType, entityId, summary, details = {} }) {
  if (!isAdmin() || !state.session?.user?.id) {
    return;
  }

  const result = await supabase.from("admin_audit_logs").insert({
    actor_id: state.session.user.id,
    actor_name: state.profile?.full_name || null,
    actor_email: state.session.user.email || null,
    action_type: actionType,
    entity_type: entityType,
    entity_id: entityId || null,
    summary,
    details,
  });

  if (
    result.error &&
    !/admin_audit_logs|Could not find the table|relation .* does not exist/i.test(
      result.error.message || ""
    )
  ) {
    console.warn("Audit log write failed:", result.error.message);
  }
}

function currentMemberName(memberId, memberCode) {
  const member = state.members.find((item) => item.id === memberId);
  return member?.full_name || memberCode || "member";
}

function bindCollectionButtons(container) {
  container.querySelectorAll(".collection-edit-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const record = state.collections.find((item) => item.id === button.dataset.id);
      if (!record) {
        return;
      }
      populateCollectionForm(record);
      activateTab("collections");
      document
        .getElementById("collectionsFormCard")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  container.querySelectorAll(".collection-receipt-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const record = state.collections.find((item) => item.id === button.dataset.id);
      if (record) {
        downloadReceipt(record);
      }
    });
  });
}

function bindDonationButtons(container) {
  container.querySelectorAll(".donation-edit-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const donation = state.donations.find((item) => item.id === button.dataset.id);
      if (donation) {
        populateDonationForm(donation);
        activateTab("donations");
      }
    });
  });
}

function bindEventButtons(container) {
  container.querySelectorAll(".event-edit-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const event = state.events.find((item) => item.id === button.dataset.id);
      if (event) {
        populateEventForm(event);
        activateTab("events");
      }
    });
  });
}

function bindAnnouncementButtons(container) {
  container.querySelectorAll(".announcement-edit-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const announcement = state.announcements.find((item) => item.id === button.dataset.id);
      if (announcement) {
        populateAnnouncementForm(announcement);
        activateTab("announcements");
      }
    });
  });
}

function bindRequestButtons(container) {
  container.querySelectorAll(".request-approve-btn").forEach((button) => {
    button.addEventListener("click", () => handleRequestReview(button.dataset.id, "Approved"));
  });
  container.querySelectorAll(".request-reject-btn").forEach((button) => {
    button.addEventListener("click", () => handleRequestReview(button.dataset.id, "Rejected"));
  });
  container.querySelectorAll(".request-doc-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      await openStorageDocument(button.dataset.path, button.dataset.label);
    });
  });
}

async function handleCollectionSave(event) {
  event.preventDefault();
  if (!isAdmin()) {
    return;
  }

  const collectionId = document.getElementById("collectionId").value;
  const memberId = document.getElementById("collectionMember").value;
  const member = state.members.find((item) => item.id === memberId);
  if (!member) {
    setAuthMessage("Select a valid member before saving the collection.");
    return;
  }

  const payload = {
    member_id: member.id,
    member_code: member.member_code,
    member_name: member.full_name,
    month_key: document.getElementById("collectionMonth").value,
    month_date: getMonthStartIso(document.getElementById("collectionMonth").value),
    amount: Number(document.getElementById("collectionAmount").value || monthlyCollectionDefault),
    payment_date: document.getElementById("collectionDate").value || null,
    status: document.getElementById("collectionStatus").value,
    remarks: document.getElementById("collectionRemarks").value.trim(),
  };

  const result = collectionId
    ? await supabase.from("collections").update(payload).eq("id", collectionId).select().single()
    : await supabase.from("collections").insert(payload).select().single();

  if (result.error) {
    setAuthMessage(result.error.message);
    return;
  }

  await writeAdminAuditLog({
    actionType: collectionId ? "collection_updated" : "collection_created",
    entityType: "collection",
    entityId: result.data?.id,
    summary: `${collectionId ? "Updated" : "Created"} collection for ${member.full_name}`,
    details: {
      member_code: member.member_code,
      month_key: payload.month_key,
      amount: payload.amount,
      status: payload.status,
    },
  });

  resetCollectionForm();
  await loadData();
  renderAll();
}

async function handleDonationSave(event) {
  event.preventDefault();
  if (!isAdmin()) {
    return;
  }

  const donationId = document.getElementById("donationId").value;
  const payload = {
    donor_name: document.getElementById("donorName").value.trim(),
    donor_phone: document.getElementById("donorPhone").value.trim(),
    amount: Number(document.getElementById("donationAmount").value || 0),
    donation_date: document.getElementById("donationDate").value,
    purpose: document.getElementById("donationPurpose").value.trim(),
    notes: document.getElementById("donationNotes").value.trim(),
  };

  const result = donationId
    ? await supabase.from("donations").update(payload).eq("id", donationId).select().single()
    : await supabase.from("donations").insert(payload).select().single();

  if (result.error) {
    setAuthMessage(result.error.message);
    return;
  }

  await writeAdminAuditLog({
    actionType: donationId ? "donation_updated" : "donation_created",
    entityType: "donation",
    entityId: result.data?.id,
    summary: `${donationId ? "Updated" : "Created"} donation for ${payload.donor_name}`,
    details: {
      donor_name: payload.donor_name,
      amount: payload.amount,
      donation_date: payload.donation_date,
      purpose: payload.purpose,
    },
  });

  resetDonationForm();
  await loadData();
  renderAll();
}

async function handleEventSave(event) {
  event.preventDefault();
  if (!isAdmin()) {
    return;
  }

  const eventId = document.getElementById("eventId").value;
  const payload = {
    title: document.getElementById("eventTitle").value.trim(),
    event_date: document.getElementById("eventDate").value,
    venue: document.getElementById("eventVenue").value.trim(),
    coordinator: document.getElementById("eventCoordinator").value.trim(),
    description: document.getElementById("eventDescription").value.trim(),
  };

  const result = eventId
    ? await supabase.from("events").update(payload).eq("id", eventId).select().single()
    : await supabase.from("events").insert(payload).select().single();

  if (result.error) {
    setAuthMessage(result.error.message);
    return;
  }

  await writeAdminAuditLog({
    actionType: eventId ? "event_updated" : "event_created",
    entityType: "event",
    entityId: result.data?.id,
    summary: `${eventId ? "Updated" : "Created"} event "${payload.title}"`,
    details: {
      title: payload.title,
      event_date: payload.event_date,
      venue: payload.venue,
    },
  });

  resetEventForm();
  await loadData();
  renderAll();
}

async function handleAnnouncementSave(event) {
  event.preventDefault();
  if (!isAdmin()) {
    return;
  }

  const announcementId = document.getElementById("announcementId").value;
  const payload = {
    title: document.getElementById("announcementTitle").value.trim(),
    announcement_date: document.getElementById("announcementDate").value,
    category: document.getElementById("announcementCategory").value,
    status: document.getElementById("announcementStatus").value,
    message: document.getElementById("announcementMessage").value.trim(),
  };

  const result = announcementId
    ? await supabase
        .from("announcements")
        .update(payload)
        .eq("id", announcementId)
        .select()
        .single()
    : await supabase.from("announcements").insert(payload).select().single();

  if (result.error) {
    setAuthMessage(result.error.message);
    return;
  }

  await writeAdminAuditLog({
    actionType: announcementId ? "announcement_updated" : "announcement_created",
    entityType: "announcement",
    entityId: result.data?.id,
    summary: `${announcementId ? "Updated" : "Created"} announcement "${payload.title}"`,
    details: {
      title: payload.title,
      announcement_date: payload.announcement_date,
      category: payload.category,
      status: payload.status,
    },
  });

  resetAnnouncementForm();
  await loadData();
  renderAll();
}

async function handleRequestSubmit(event) {
  event.preventDefault();
  if (isAdmin()) {
    return;
  }

  if (!state.memberRecord) {
    setRequestNotice("No linked member profile was found for this login.");
    return;
  }

  setRequestNotice("Submitting update request...");

  const requestDocumentResult = await uploadRequestDocuments();
  if (requestDocumentResult.error) {
    setRequestNotice(requestDocumentResult.error);
    return;
  }

  const payload = {
    full_name: document.getElementById("requestName").value.trim(),
    gender: document.getElementById("requestGender").value,
    phone: document.getElementById("requestPhone").value.trim(),
    email: document.getElementById("requestEmail").value.trim(),
    occupation: document.getElementById("requestOccupation").value.trim(),
    dob: document.getElementById("requestDob").value,
    aadhar_number: formatAadhaarNumber(document.getElementById("requestAadhaarNumber").value),
    present_address: getAddressFieldsFromForm("requestPresent"),
    permanent_address: getAddressFieldsFromForm("requestPermanent"),
    family_members: collectRequestFamilyMembers(),
    member_photo_path:
      requestDocumentResult.member_photo_path || state.memberRecord.member_photo_path || null,
    aadhar_card_path:
      requestDocumentResult.aadhar_card_path || state.memberRecord.aadhar_card_path || null,
  };

  const { error } = await supabase.from("member_update_requests").insert({
    member_id: state.memberRecord.id,
    member_code: state.memberRecord.member_code,
    requested_by: state.session.user.id,
    proposed_data: payload,
  });

  if (error) {
    setRequestNotice(error.message);
    return;
  }

  setRequestNotice("Update request submitted successfully.");
  resetRequestForm();
  await loadData();
  renderAll();
}

async function handleRequestReview(requestId, status) {
  if (!isAdmin()) {
    return;
  }

  const request = state.requests.find((item) => item.id === requestId);
  if (!request) {
    return;
  }

  if (status === "Approved") {
    const { error: memberError } = await supabase
      .from("members")
      .update({
        ...request.proposed_data,
      })
      .eq("id", request.member_id);

    if (memberError) {
      setAuthMessage(memberError.message);
      return;
    }
  }

  const { error } = await supabase
    .from("member_update_requests")
    .update({
      status,
      reviewed_by: state.session.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    setAuthMessage(error.message);
    return;
  }

  await writeAdminAuditLog({
    actionType: status === "Approved" ? "request_approved" : "request_rejected",
    entityType: "member_update_request",
    entityId: requestId,
    summary: `${status} update request for ${currentMemberName(request.member_id, request.member_code)}`,
    details: {
      member_code: request.member_code,
      status,
      requested_changes: summarizeRequestChanges(
        state.members.find((member) => member.id === request.member_id) || null,
        request.proposed_data || {}
      ),
    },
  });

  await loadData();
  renderAll();
}

function populateCollectionForm(collection) {
  document.getElementById("collectionId").value = collection.id;
  document.getElementById("collectionMember").value = collection.member_id;
  document.getElementById("collectionMonth").value = collection.month_key;
  document.getElementById("collectionAmount").value = collection.amount;
  document.getElementById("collectionDate").value = collection.payment_date || "";
  document.getElementById("collectionStatus").value = collection.status;
  document.getElementById("collectionRemarks").value = collection.remarks || "";
  document.getElementById("collectionFormTitle").textContent = "Edit Collection";
}

function resetCollectionForm() {
  document.getElementById("collectionForm").reset();
  document.getElementById("collectionId").value = "";
  document.getElementById("collectionAmount").value = monthlyCollectionDefault;
  document.getElementById("collectionMonth").value = getCurrentMonthKey();
  document.getElementById("collectionDate").value = getTodayIso();
  document.getElementById("collectionFormTitle").textContent = "Add Collection";
}

function populateDonationForm(donation) {
  document.getElementById("donationId").value = donation.id;
  document.getElementById("donorName").value = donation.donor_name || "";
  document.getElementById("donorPhone").value = donation.donor_phone || "";
  document.getElementById("donationAmount").value = donation.amount || "";
  document.getElementById("donationDate").value = donation.donation_date || "";
  document.getElementById("donationPurpose").value = donation.purpose || "";
  document.getElementById("donationNotes").value = donation.notes || "";
  document.getElementById("donationFormTitle").textContent = "Edit Donation";
}

function resetDonationForm() {
  document.getElementById("donationForm").reset();
  document.getElementById("donationId").value = "";
  document.getElementById("donationDate").value = getTodayIso();
  document.getElementById("donationFormTitle").textContent = "Add Donation";
}

function populateEventForm(item) {
  document.getElementById("eventId").value = item.id;
  document.getElementById("eventTitle").value = item.title || "";
  document.getElementById("eventDate").value = item.event_date || "";
  document.getElementById("eventVenue").value = item.venue || "";
  document.getElementById("eventCoordinator").value = item.coordinator || "";
  document.getElementById("eventDescription").value = item.description || "";
  document.getElementById("eventFormTitle").textContent = "Edit Event";
}

function resetEventForm() {
  document.getElementById("eventForm").reset();
  document.getElementById("eventId").value = "";
  document.getElementById("eventDate").value = getTodayIso();
  document.getElementById("eventFormTitle").textContent = "Create Event";
}

function populateAnnouncementForm(item) {
  document.getElementById("announcementId").value = item.id;
  document.getElementById("announcementTitle").value = item.title || "";
  document.getElementById("announcementDate").value = item.announcement_date || "";
  document.getElementById("announcementCategory").value = item.category || "General";
  document.getElementById("announcementStatus").value = item.status || "Active";
  document.getElementById("announcementMessage").value = item.message || "";
  document.getElementById("announcementFormTitle").textContent = "Edit Announcement";
}

function resetAnnouncementForm() {
  document.getElementById("announcementForm").reset();
  document.getElementById("announcementId").value = "";
  document.getElementById("announcementDate").value = getTodayIso();
  document.getElementById("announcementFormTitle").textContent = "Post Announcement";
}

function prefillRequestForm() {
  if (isAdmin() || !state.memberRecord) {
    return;
  }

  document.getElementById("requestName").value = state.memberRecord.full_name || "";
  document.getElementById("requestGender").value = state.memberRecord.gender || "";
  document.getElementById("requestPhone").value = state.memberRecord.phone || "";
  document.getElementById("requestEmail").value = state.memberRecord.email || "";
  document.getElementById("requestOccupation").value = state.memberRecord.occupation || "";
  document.getElementById("requestDob").value = state.memberRecord.dob || "";
  document.getElementById("requestAadhaarNumber").value =
    state.memberRecord.aadhar_number || "";
  setAddressFieldsToForm("requestPresent", state.memberRecord.present_address || {});
  setAddressFieldsToForm("requestPermanent", state.memberRecord.permanent_address || {});
  renderRequestFamilyMemberRows(state.memberRecord.family_members || []);
  syncRequestDocumentButtons();
}

function resetRequestForm() {
  document.getElementById("requestForm").reset();
  setRequestNotice("");
  renderRequestFamilyMemberRows();
  if (!isAdmin() && state.memberRecord) {
    prefillRequestForm();
  }
  syncRequestDocumentButtons();
}

function renderRequestFamilyMemberRows(rows = []) {
  const container = document.getElementById("requestFamilyMembersList");
  const normalizedRows = normalizeFamilyMembers(rows);
  const values = normalizedRows.length ? normalizedRows : [{ name: "", relation: "" }];
  container.innerHTML = "";
  values.forEach((row) => addRequestFamilyMemberRow(row));
}

function addRequestFamilyMemberRow(row = {}) {
  const container = document.getElementById("requestFamilyMembersList");
  const wrapper = document.createElement("div");
  wrapper.className = "family-row";
  const options = FAMILY_RELATIONS.map(
    (relation) =>
      `<option value="${relation}" ${
        row.relation === relation ? "selected" : ""
      }>${relation}</option>`
  ).join("");

  wrapper.innerHTML = `
    <label>
      Family Member Name
      <input class="family-member-name" type="text" value="${escapeAttribute(row.name || "")}" />
    </label>
    <label>
      Relation
      <select class="family-member-relation">
        <option value="">Select Relation</option>
        ${options}
      </select>
    </label>
    <button type="button" class="ghost-button ghost-button--small family-remove-btn">Remove</button>
  `;

  wrapper.querySelector(".family-remove-btn").addEventListener("click", () => {
    wrapper.remove();
    if (!container.children.length) {
      addRequestFamilyMemberRow();
    }
  });

  container.appendChild(wrapper);
}

function collectRequestFamilyMembers() {
  return normalizeFamilyMembers(
    [...document.querySelectorAll("#requestFamilyMembersList .family-row")].map((row) => ({
      name: row.querySelector(".family-member-name").value.trim(),
      relation: row.querySelector(".family-member-relation").value,
    }))
  );
}

async function uploadRequestDocuments() {
  const updates = {};
  const memberPhotoFile = document.getElementById("requestPhotoFile").files[0];
  const aadhaarFile = document.getElementById("requestAadhaarFile").files[0];

  if (memberPhotoFile) {
    const photoPath = buildRequestStoragePath(state.memberRecord.id, "member-photo", memberPhotoFile.name);
    const { error } = await supabase.storage.from(storageBucket).upload(photoPath, memberPhotoFile, {
      upsert: true,
    });
    if (error) {
      return {
        error: `Could not upload requested member photo: ${error.message}`,
      };
    }
    updates.member_photo_path = photoPath;
  }

  if (aadhaarFile) {
    const aadhaarPath = buildRequestStoragePath(state.memberRecord.id, "aadhaar-card", aadhaarFile.name);
    const { error } = await supabase.storage.from(storageBucket).upload(aadhaarPath, aadhaarFile, {
      upsert: true,
    });
    if (error) {
      return {
        error: `Could not upload requested Aadhaar document: ${error.message}`,
      };
    }
    updates.aadhar_card_path = aadhaarPath;
  }

  return updates;
}

function buildRequestStoragePath(memberId, label, fileName) {
  const safeName = `${fileName || "file"}`
    .replace(/[^a-zA-Z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-");
  return `members/${memberId}/request-${label}-${Date.now()}-${safeName}`;
}

function syncRequestDocumentButtons() {
  toggleElementDisplay(
    document.getElementById("requestCurrentPhotoBtn"),
    Boolean(state.memberRecord?.member_photo_path)
  );
  toggleElementDisplay(
    document.getElementById("requestCurrentAadhaarBtn"),
    Boolean(state.memberRecord?.aadhar_card_path)
  );

  const requestDocumentStatus = document.getElementById("requestDocumentStatus");
  if (!requestDocumentStatus) {
    return;
  }

  requestDocumentStatus.textContent = state.memberRecord?.member_photo_path || state.memberRecord?.aadhar_card_path
    ? "You can review the current saved documents here. Upload new files if you want admin approval for replacements."
    : "Upload new files if you want the admin to review and add member documents.";
}

async function openStorageDocument(path, label) {
  const popup = openPopup(label);
  writePopupMessage(popup, `Loading ${label}...`);

  const { data, error } = await supabase.storage.from(storageBucket).createSignedUrl(path, 60);
  if (error) {
    writePopupMessage(popup, error.message);
    return;
  }

  renderPopupDocument(popup, data.signedUrl, label);
}

function downloadReceipt(collection) {
  const member =
    state.members.find((item) => item.id === collection.member_id) || state.memberRecord;
  const logoUrl = new URL("./assets/mandir-logo.jpg", window.location.href).href;
  const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Monthly Receipt - ${escapeHtml(collection.member_code)}</title>
      <style>
        body { font-family: Georgia, serif; color: #3c190f; padding: 32px; }
        .box { border: 1px solid #c7a47e; border-radius: 16px; padding: 24px; }
        .box-header { text-align: center; border-bottom: 2px solid #c85e12; padding-bottom: 18px; margin-bottom: 22px; }
        .receipt-logo { width: 110px; height: auto; display: block; margin: 0 auto 14px; }
        h1, h2 { margin: 0 0 12px; }
        p { margin: 8px 0; }
      </style>
    </head>
    <body>
      <div class="box">
        <div class="box-header">
        <img class="receipt-logo" src="${logoUrl}" alt="Milan Mandir Logo" />
        <h1>MILAN MANDIR</h1>
        <p>High School Colony, Ward No. 3, Jalukie, Dist: Peren, Nagaland - 797110, INDIA</p>
        </div>
        <h2>Monthly Collection Receipt</h2>
        <p><strong>Member Name:</strong> ${escapeHtml(collection.member_name || member?.full_name || "")}</p>
        <p><strong>Member ID:</strong> ${escapeHtml(collection.member_code || member?.member_code || "")}</p>
        <p><strong>Month:</strong> ${escapeHtml(collection.month_key)}</p>
        <p><strong>Amount:</strong> ${escapeHtml(formatCurrency(collection.amount))}</p>
        <p><strong>Status:</strong> ${escapeHtml(collection.status)}</p>
        <p><strong>Payment Date:</strong> ${escapeHtml(formatDate(collection.payment_date))}</p>
        <p><strong>Remarks:</strong> ${escapeHtml(collection.remarks || "None")}</p>
      </div>
    </body>
  </html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${collection.member_code || "member"}-${collection.month_key}-receipt.html`;
  link.click();
  URL.revokeObjectURL(url);
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
    return "No data available";
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

function getMembersExportRows() {
  return getFilteredMembers().map((member) => ({
    "Member ID": member.member_code || "",
    "Full Name": member.full_name || "",
    Gender: member.gender || "",
    Phone: member.phone || "",
    Email: member.email || "",
    Occupation: member.occupation || "",
    DOB: member.dob || "",
    Aadhaar: member.aadhar_number || "",
    "Present Address": formatAddress(normalizeAddressFields(member.present_address)),
    "Permanent Address": formatAddress(normalizeAddressFields(member.permanent_address)),
    Family: formatFamilyDetails(member.family_members),
    "Login Linked": member.auth_user_id ? "Yes" : "No",
    "Created At": formatDateTime(member.created_at),
  }));
}

function getCollectionsExportRows() {
  return state.collections
    .slice()
    .sort((left, right) => `${right.month_key}`.localeCompare(`${left.month_key}`))
    .map((collection) => ({
      "Member Name": collection.member_name || "",
      "Member ID": collection.member_code || "",
      Month: collection.month_key || "",
      Amount: collection.amount ?? "",
      Status: collection.status || "",
      "Payment Date": collection.payment_date || "",
      Remarks: collection.remarks || "",
      "Created At": formatDateTime(collection.created_at),
    }));
}

function getDonationsExportRows() {
  return state.donations
    .slice()
    .sort((left, right) => `${right.donation_date}`.localeCompare(`${left.donation_date}`))
    .map((donation) => ({
      "Donor Name": donation.donor_name || "",
      "Contact Number": donation.donor_phone || "",
      Amount: donation.amount ?? "",
      "Donation Date": donation.donation_date || "",
      Purpose: donation.purpose || "",
      Notes: donation.notes || "",
      "Created At": formatDateTime(donation.created_at),
    }));
}

function getRequestsExportRows() {
  return state.requests
    .slice()
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
    .map((request) => {
      const member = state.members.find((item) => item.id === request.member_id);
      return {
        "Member Name": member?.full_name || "",
        "Member ID": request.member_code || "",
        Status: request.status || "",
        "Requested At": formatDateTime(request.created_at),
        "Reviewed At": formatDateTime(request.reviewed_at),
        "Requested Changes": summarizeRequestChanges(member, request.proposed_data || {}),
      };
    });
}

function getPendingCollectionsExportRows() {
  const currentMonth = getCurrentMonthKey();
  const previousMonth = getRelativeMonthKey(-1);

  return getPendingPaymentSummary(currentMonth, previousMonth).map((item) => ({
    "Member Name": item.name || "",
    "Member ID": item.memberCode || "",
    Phone: item.phone || "",
    "Current Month Status": item.currentMonthPending ? "Pending" : "Paid / No pending record",
    "Previous Month Status": item.previousMonthPending ? "Pending" : "Paid / No pending record",
    "Total Pending Months": item.totalPendingMonths,
  }));
}

function getAuditExportRows() {
  return state.auditLogs.map((entry) => ({
    "Created At": formatDateTime(entry.created_at),
    "Actor Name": entry.actor_name || "",
    "Actor Email": entry.actor_email || "",
    "Action Type": entry.action_type || "",
    "Entity Type": entry.entity_type || "",
    "Entity ID": entry.entity_id || "",
    Summary: entry.summary || "",
    Details: entry.details ? JSON.stringify(entry.details) : "",
  }));
}

function bindDashboardDetailButtons() {
  document.querySelectorAll(".dashboard-detail-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const monthKey = button.dataset.month;
      const type = button.dataset.type;
      state.dashboardDetail = buildDashboardDetailState(monthKey, type);
      renderDashboardDetail();
      document
        .getElementById("dashboardDetailCard")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function buildDashboardDetailState(monthKey, type) {
  const records =
    type === "collections"
      ? state.collections
          .filter((item) => item.month_key === monthKey)
          .slice()
          .sort((left, right) => new Date(right.payment_date || 0) - new Date(left.payment_date || 0))
      : state.donations
          .filter((item) => `${item.donation_date || ""}`.slice(0, 7) === monthKey)
          .slice()
          .sort((left, right) => new Date(right.donation_date || 0) - new Date(left.donation_date || 0));

  const rows =
    type === "collections"
      ? records.map((item) => ({
          "Member Name": item.member_name || "",
          "Member ID": item.member_code || "",
          Month: item.month_key || "",
          Amount: formatCurrency(item.amount),
          Status: item.status || "",
          "Payment Date": formatDate(item.payment_date),
          Remarks: item.remarks || "",
        }))
      : records.map((item) => ({
          "Donor Name": item.donor_name || "",
          "Contact Number": item.donor_phone || "",
          Amount: formatCurrency(item.amount),
          "Donation Date": formatDate(item.donation_date),
          Purpose: item.purpose || "",
          Notes: item.notes || "",
        }));

  return {
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    type,
    title:
      type === "collections"
        ? `Collection Details for ${formatMonthLabel(monthKey)}`
        : `Donation Details for ${formatMonthLabel(monthKey)}`,
    meta:
      type === "collections"
        ? `Showing all collection records for ${formatMonthLabel(monthKey)}.`
        : `Showing all donation records for ${formatMonthLabel(monthKey)}.`,
    rows,
  };
}

function renderDashboardDetail() {
  const card = document.getElementById("dashboardDetailCard");
  const title = document.getElementById("dashboardDetailTitle");
  const meta = document.getElementById("dashboardDetailMeta");
  const head = document.getElementById("dashboardDetailTableHead");
  const body = document.getElementById("dashboardDetailTableBody");
  const csvButton = document.getElementById("dashboardDetailCsvBtn");
  const excelButton = document.getElementById("dashboardDetailExcelBtn");

  if (!isAdmin() || !state.dashboardDetail) {
    card.classList.add("is-hidden");
    return;
  }

  card.classList.remove("is-hidden");
  title.textContent = state.dashboardDetail.title;
  meta.textContent = state.dashboardDetail.meta;

  const rows = state.dashboardDetail.rows || [];
  if (!rows.length) {
    head.innerHTML = "";
    body.innerHTML = `<tr><td class="dashboard-detail-empty" colspan="8">No records found for this month.</td></tr>`;
  } else {
    const headers = Object.keys(rows[0]);
    head.innerHTML = `<tr>${headers
      .map((header) => `<th>${escapeHtml(header)}</th>`)
      .join("")}</tr>`;
    body.innerHTML = rows
      .map(
        (row) =>
          `<tr>${headers
            .map((header) => `<td>${escapeHtml(row[header] ?? "")}</td>`)
            .join("")}</tr>`
      )
      .join("");
  }

  csvButton.onclick = () => {
    exportRows(
      "csv",
      `milan-mandir-${state.dashboardDetail.monthKey}-${state.dashboardDetail.type}-detail`,
      rows
    );
  };
  excelButton.onclick = () => {
    exportRows(
      "excel",
      `milan-mandir-${state.dashboardDetail.monthKey}-${state.dashboardDetail.type}-detail`,
      rows
    );
  };
}

function toggleElementDisplay(element, shouldShow) {
  if (!element) {
    return;
  }
  element.classList.toggle("is-hidden", !shouldShow);
}

function setAuthMessage(message) {
  document.getElementById("authMessage").textContent = message || "";
}

function setAdminBackupMessage(message) {
  const element = document.getElementById("adminBackupMessage");
  if (element) {
    element.textContent = message || "";
  }
}

function setRequestNotice(message) {
  document.getElementById("requestFormNotice").textContent = message || "";
}

function isAdmin() {
  return state.profile?.role === "admin";
}
