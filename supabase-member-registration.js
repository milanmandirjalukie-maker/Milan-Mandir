import {
  FAMILY_RELATIONS,
  supabase,
  storageBucket,
  setTodayDateText,
  getTodayIso,
  formatAadhaarNumber,
  getAddressFieldsFromForm,
  setAddressFieldsToForm,
  normalizeFamilyMembers,
  generateMemberCode,
  generateUniqueMemberCode,
  openPopup,
  writePopupMessage,
  renderPopupDocument,
  escapeAttribute,
  supabaseUrl,
  supabasePublishableKey,
} from "./supabase-common.js";

let currentMember = null;
let currentAdminSession = null;
let currentAdminProfile = null;

document.addEventListener("DOMContentLoaded", initMemberRegistration);

async function initMemberRegistration() {
  setTodayDateText("registrationDateLabel");
  bindEvents();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user?.id) {
    window.location.href = "./supabase-index.html";
    return;
  }

  currentAdminSession = session;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (profileError || profile.role !== "admin") {
    window.location.href = "./supabase-index.html";
    return;
  }

  currentAdminProfile = profile;

  const memberId = new URLSearchParams(window.location.search).get("memberId");
  if (memberId) {
    await loadMember(memberId);
  } else {
    prepareNewForm();
  }
}

function bindEvents() {
  document
    .getElementById("memberRegistrationForm")
    .addEventListener("submit", handleMemberSave);
  document.getElementById("memberResetBtn").addEventListener("click", handleReset);
  document.getElementById("addFamilyMemberBtn").addEventListener("click", () => addFamilyRow());
  document.getElementById("memberPhone").addEventListener("input", updateMemberCodePreview);
  document.getElementById("memberAadhaarNumber").addEventListener("input", (event) => {
    event.target.value = formatAadhaarNumber(event.target.value);
  });
  document.getElementById("createMemberLogin").addEventListener("change", syncLoginInputs);
  document.getElementById("memberPhotoViewBtn").addEventListener("click", async () => {
    if (currentMember?.member_photo_path) {
      await openStorageDocument(currentMember.member_photo_path, "Member Photo");
    }
  });
  document.getElementById("memberAadhaarViewBtn").addEventListener("click", async () => {
    if (currentMember?.aadhar_card_path) {
      await openStorageDocument(currentMember.aadhar_card_path, "Aadhaar Card");
    }
  });
}

async function loadMember(memberId) {
  setNotice("Loading member...");
  const { data, error } = await supabase.from("members").select("*").eq("id", memberId).single();

  if (error) {
    setNotice(error.message);
    prepareNewForm();
    return;
  }

  currentMember = data;
  document.getElementById("registrationHeroTitle").textContent = "Edit Member";
  document.getElementById("registrationHeroLead").textContent =
    "Update this live member record in the shared Supabase database.";
  document.getElementById("memberFormTitle").textContent = `Edit Member: ${data.full_name}`;
  document.getElementById("memberSubmitBtn").textContent = "Update Member";
  document.getElementById("memberId").value = data.id;
  document.getElementById("memberAuthUserId").value = data.auth_user_id || "";
  document.getElementById("memberLoginEmail").value = data.email || "";
  document.getElementById("createMemberLogin").checked = true;
  document.getElementById("memberCode").value = data.member_code || "";
  document.getElementById("memberName").value = data.full_name || "";
  document.getElementById("memberGender").value = data.gender || "";
  document.getElementById("memberPhone").value = data.phone || "";
  document.getElementById("memberEmail").value = data.email || "";
  document.getElementById("memberOccupation").value = data.occupation || "";
  document.getElementById("memberDob").value = data.dob || "";
  document.getElementById("memberAadhaarNumber").value = data.aadhar_number || "";
  setAddressFieldsToForm("memberPresent", data.present_address || {});
  setAddressFieldsToForm("memberPermanent", data.permanent_address || {});
  renderFamilyRows(data.family_members || []);
  syncLoginInputs();
  syncDocumentButtons();
  setNotice("");
}

function prepareNewForm() {
  currentMember = null;
  document.getElementById("memberRegistrationForm").reset();
  document.getElementById("memberId").value = "";
  document.getElementById("memberCode").value = "";
  document.getElementById("memberLoginEmail").value = "";
  document.getElementById("createMemberLogin").checked = true;
  document.getElementById("registrationHeroTitle").textContent = "Register Member";
  document.getElementById("registrationHeroLead").textContent =
    "Create a new live member record in the shared Supabase database.";
  document.getElementById("memberFormTitle").textContent = "Register Member";
  document.getElementById("memberSubmitBtn").textContent = "Save Member";
  renderFamilyRows();
  syncLoginInputs();
  syncDocumentButtons();
  setNotice("");
}

function handleReset() {
  if (currentMember?.id) {
    void loadMember(currentMember.id);
    return;
  }

  prepareNewForm();
}

async function handleMemberSave(event) {
  event.preventDefault();
  setNotice("Saving member...");

  const wasExistingMember = Boolean(
    document.getElementById("memberId").value || currentMember?.id || null
  );
  const memberId = document.getElementById("memberId").value || currentMember?.id || null;
  let authUserId = document.getElementById("memberAuthUserId").value.trim() || null;
  const createMemberLogin = document.getElementById("createMemberLogin").checked;
  const memberLoginEmail = document.getElementById("memberLoginEmail").value.trim().toLowerCase();
  const registrationDate = currentMember?.created_at || getTodayIso();
  const phone = document.getElementById("memberPhone").value.trim();

  const memberCode =
    currentMember?.member_code ||
    (await generateUniqueMemberCode(phone, registrationDate));

  const payload = {
    auth_user_id: authUserId,
    member_code: memberCode,
    full_name: document.getElementById("memberName").value.trim(),
    gender: document.getElementById("memberGender").value,
    phone,
    email: document.getElementById("memberEmail").value.trim() || memberLoginEmail,
    occupation: document.getElementById("memberOccupation").value.trim(),
    dob: document.getElementById("memberDob").value,
    aadhar_number: formatAadhaarNumber(document.getElementById("memberAadhaarNumber").value),
    present_address: getAddressFieldsFromForm("memberPresent"),
    permanent_address: getAddressFieldsFromForm("memberPermanent"),
    family_members: collectFamilyRows(),
  };

  const result = memberId
    ? await supabase.from("members").update(payload).eq("id", memberId).select().single()
    : await supabase.from("members").insert(payload).select().single();

  if (result.error) {
    setNotice(`Member save failed: ${result.error.message}`);
    return;
  }

  currentMember = result.data;
  document.getElementById("memberCode").value = currentMember.member_code || "";

  if (createMemberLogin && !authUserId) {
    const autoLoginResult = await createMemberLoginForMember({
      memberId: currentMember.id,
      fullName: currentMember.full_name,
      email: memberLoginEmail || currentMember.email,
      phone: currentMember.phone,
    });

    if (autoLoginResult.error) {
      setNotice(autoLoginResult.error);
      return;
    }

    authUserId = autoLoginResult.authUserId || null;
    currentMember.auth_user_id = authUserId;
    document.getElementById("memberAuthUserId").value = authUserId || "";
    document.getElementById("memberLoginEmail").value = autoLoginResult.email || currentMember.email || "";
    setNotice(
      `Member saved. Login created successfully. Initial password is the mobile number: ${autoLoginResult.initialPassword}`
    );
  } else {
    setNotice("Member saved. Uploading files if selected...");
  }

  const uploadError = await uploadSelectedFiles();
  if (uploadError) {
    setNotice(uploadError);
    return;
  }

  const profileError = await upsertLinkedProfile();
  if (profileError) {
    setNotice(profileError);
    return;
  }

  await writeAdminAuditLog({
    actionType: wasExistingMember ? "member_updated" : "member_created",
    entityType: "member",
    entityId: currentMember.id,
    summary: `${wasExistingMember ? "Updated" : "Created"} member ${currentMember.full_name}`,
    details: {
      member_code: currentMember.member_code,
      phone: currentMember.phone,
      email: currentMember.email,
      auth_user_id: currentMember.auth_user_id || null,
      has_member_photo: Boolean(currentMember.member_photo_path),
      has_aadhaar_document: Boolean(currentMember.aadhar_card_path),
    },
  });

  window.location.href = "./supabase-index.html?tab=members";
}

async function uploadSelectedFiles() {
  const updates = {};
  const memberPhotoFile = document.getElementById("memberPhotoFile").files[0];
  const aadhaarFile = document.getElementById("memberAadhaarCardFile").files[0];

  if (memberPhotoFile) {
    const photoPath = buildStoragePath(currentMember.id, "member-photo", memberPhotoFile.name);
    const { error } = await supabase.storage.from(storageBucket).upload(photoPath, memberPhotoFile, {
      upsert: true,
    });
    if (error) {
      return `Member saved, but photo upload failed: ${error.message}`;
    }
    updates.member_photo_path = photoPath;
  }

  if (aadhaarFile) {
    const aadhaarPath = buildStoragePath(currentMember.id, "aadhaar-card", aadhaarFile.name);
    const { error } = await supabase.storage.from(storageBucket).upload(aadhaarPath, aadhaarFile, {
      upsert: true,
    });
    if (error) {
      return `Member saved, but Aadhaar upload failed: ${error.message}`;
    }
    updates.aadhar_card_path = aadhaarPath;
  }

  if (!Object.keys(updates).length) {
    return "";
  }

  const { data, error } = await supabase
    .from("members")
    .update(updates)
    .eq("id", currentMember.id)
    .select()
    .single();

  if (error) {
    return `Member saved, but file path update failed: ${error.message}`;
  }

  currentMember = data;
  syncDocumentButtons();
  return "";
}

async function upsertLinkedProfile() {
  if (!currentMember?.auth_user_id) {
    return "";
  }

  const { error } = await supabase.from("profiles").upsert({
    id: currentMember.auth_user_id,
    full_name: currentMember.full_name,
    role: "member",
    phone: currentMember.phone,
    email: currentMember.email,
    member_id: currentMember.id,
  });

  return error ? `Member saved, but member profile link failed: ${error.message}` : "";
}

function buildStoragePath(memberId, label, fileName) {
  const safeName = `${fileName || "file"}`
    .replace(/[^a-zA-Z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-");
  return `members/${memberId}/${label}-${Date.now()}-${safeName}`;
}

function updateMemberCodePreview() {
  if (currentMember?.member_code) {
    document.getElementById("memberCode").value = currentMember.member_code;
    return;
  }

  const phone = document.getElementById("memberPhone").value.trim();
  document.getElementById("memberCode").value = phone ? generateMemberCode(phone) : "";
}

function syncLoginInputs() {
  const shouldAutoCreate = document.getElementById("createMemberLogin").checked;
  const authUserIdInput = document.getElementById("memberAuthUserId");
  const loginEmailInput = document.getElementById("memberLoginEmail");
  authUserIdInput.disabled = shouldAutoCreate;
  if (shouldAutoCreate && !loginEmailInput.value.trim()) {
    loginEmailInput.value = document.getElementById("memberEmail").value.trim();
  }
}

function renderFamilyRows(rows = []) {
  const container = document.getElementById("familyMembersList");
  const normalized = normalizeFamilyMembers(rows);
  const values = normalized.length ? normalized : [{ name: "", relation: "" }];
  container.innerHTML = "";
  values.forEach((row) => addFamilyRow(row));
}

function addFamilyRow(row = {}) {
  const container = document.getElementById("familyMembersList");
  const wrapper = document.createElement("div");
  wrapper.className = "family-row";

  const relationOptions = FAMILY_RELATIONS.map(
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
        ${relationOptions}
      </select>
    </label>
    <button type="button" class="ghost-button ghost-button--small family-remove-btn">Remove</button>
  `;

  wrapper.querySelector(".family-remove-btn").addEventListener("click", () => {
    wrapper.remove();
    if (!container.children.length) {
      addFamilyRow();
    }
  });

  container.appendChild(wrapper);
}

function collectFamilyRows() {
  return normalizeFamilyMembers(
    [...document.querySelectorAll("#familyMembersList .family-row")].map((row) => ({
      name: row.querySelector(".family-member-name").value.trim(),
      relation: row.querySelector(".family-member-relation").value,
    }))
  );
}

function syncDocumentButtons() {
  toggleButton("memberPhotoViewBtn", Boolean(currentMember?.member_photo_path));
  toggleButton("memberAadhaarViewBtn", Boolean(currentMember?.aadhar_card_path));
  document.getElementById("memberDocumentStatus").textContent = currentMember?.id
    ? "Existing files can be viewed here. Uploading a new file will replace the saved path."
    : "Upload member photo and Aadhaar card if available.";
}

async function createMemberLoginForMember({ memberId, fullName, email, phone }) {
  if (!email || !phone) {
    return {
      error: "Member saved, but login creation needs both email and mobile number.",
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return {
      error: "Member saved, but automatic login creation failed: Could not verify the signed-in admin session.",
    };
  }

  const { data, error } = await supabase.functions.invoke("create-member-login", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabasePublishableKey,
    },
    body: {
      memberId,
      fullName,
      email,
      phone,
    },
  });

  if (error) {
    const detailedError = await getDetailedFunctionError({
      functionName: "create-member-login",
      body: {
        memberId,
        fullName,
        email,
        phone,
      },
      fallbackMessage: error.message,
    });

    return {
      error: `Member saved, but automatic login creation failed: ${detailedError}`,
    };
  }

  if (data?.error) {
    return {
      error: `Member saved, but automatic login creation failed: ${data.error}`,
    };
  }

  return data || {};
}

async function writeAdminAuditLog({ actionType, entityType, entityId, summary, details = {} }) {
  if (!currentAdminSession?.user?.id || currentAdminProfile?.role !== "admin") {
    return;
  }

  const result = await supabase.from("admin_audit_logs").insert({
    actor_id: currentAdminSession.user.id,
    actor_name: currentAdminProfile.full_name || null,
    actor_email: currentAdminSession.user.email || null,
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

async function getDetailedFunctionError({ functionName, body, fallbackMessage }) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return fallbackMessage || "Could not verify the signed-in session.";
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabasePublishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let message = text.trim();

    try {
      const parsed = JSON.parse(text);
      if (parsed?.error) {
        message = parsed.error;
      } else if (parsed?.message) {
        message = parsed.message;
      }
    } catch {
      // Keep plain-text message if the response is not JSON.
    }

    if (!response.ok) {
      return message
        ? `${message} (HTTP ${response.status})`
        : `Edge Function failed with HTTP ${response.status}.`;
    }

    return fallbackMessage || "The function returned an unexpected response.";
  } catch (fetchError) {
    return (
      fetchError?.message ||
      fallbackMessage ||
      "Could not read the Edge Function error details."
    );
  }
}

function toggleButton(id, shouldShow) {
  document.getElementById(id).classList.toggle("is-hidden", !shouldShow);
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

function setNotice(message) {
  document.getElementById("memberFormNotice").textContent = message || "";
}
