import { ApiError, createHousehold, joinHousehold } from "./api.js";
import {
  clearIdentity,
  createLocalHousehold,
  getIdentity,
  joinLocalHousehold,
  setDisplayName,
  updateIdentity,
} from "./identity.js";

const householdRoot = document.querySelector("[data-household-setup]");

function valueFrom(form, name) {
  return new FormData(form).get(name)?.toString().trim() || "";
}

function renderIdentity(identity) {
  if (!householdRoot) return;

  const hasHousehold = Boolean(identity.householdId);
  const status = householdRoot.querySelector("[data-household-status]");
  const setupPanel = householdRoot.querySelector("[data-household-setup-panel]");
  const activePanel = householdRoot.querySelector("[data-household-active-panel]");
  const displayNameInput = householdRoot.querySelector("[name='current-display-name']");
  const inviteCode = householdRoot.querySelector("[data-household-invite-code]");
  const householdName = householdRoot.querySelector("[data-household-name]");
  const deviceKey = householdRoot.querySelector("[data-household-device]");

  if (status) {
    status.textContent = hasHousehold
      ? `hej ${identity.displayName || "kitchen friend"}`
      : "ingen hushållsburk vald än";
  }

  if (setupPanel) setupPanel.hidden = hasHousehold;
  if (activePanel) activePanel.hidden = !hasHousehold;
  if (displayNameInput) displayNameInput.value = identity.displayName || "";
  if (inviteCode) inviteCode.textContent = identity.inviteCode || "";
  if (householdName) householdName.textContent = identity.householdName || "Local household";
  if (deviceKey) deviceKey.textContent = identity.device_key || "";

  document.dispatchEvent(new CustomEvent("ravibange:identity-changed", {
    detail: identity,
  }));
}

function showMessage(message) {
  const messageTarget = householdRoot?.querySelector("[data-household-message]");
  if (!messageTarget) return;
  messageTarget.textContent = message;
}

function identityFromApiResult(result, fallbackName) {
  return updateIdentity({
    userId: result.user.id,
    displayName: result.user.display_name,
    householdId: result.household.id,
    householdName: result.household.name || fallbackName,
    inviteCode: result.household.invite_code,
  });
}

function setFormBusy(form, isBusy) {
  form.querySelectorAll("button, input").forEach((field) => {
    field.disabled = isBusy;
  });
}

function isUnavailable(error) {
  return error instanceof ApiError && error.status === 0;
}

function bindHouseholdForms() {
  if (!householdRoot) return;

  householdRoot.querySelector("[data-create-household-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const displayName = valueFrom(form, "display-name");
    const householdName = valueFrom(form, "household-name");
    if (!displayName || !householdName) return;

    setFormBusy(form, true);
    showMessage("skapar hushåll...");

    try {
      const result = await createHousehold({
        name: householdName,
        display_name: displayName,
        device_key: getIdentity().device_key,
      });
      renderIdentity(identityFromApiResult(result, householdName));
      form.reset();
      showMessage("hushåll skapat och sparat");
    } catch (error) {
      if (isUnavailable(error)) {
        renderIdentity(createLocalHousehold({ displayName, householdName }));
        form.reset();
        showMessage("Workern svarar inte, så hushållet sparades lokalt tills vidare");
      } else {
        showMessage("Kunde inte skapa hushållet just nu");
      }
    } finally {
      setFormBusy(form, false);
    }
  });

  householdRoot.querySelector("[data-join-household-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const displayName = valueFrom(form, "join-display-name");
    const inviteCode = valueFrom(form, "invite-code");
    if (!displayName || !inviteCode) return;

    setFormBusy(form, true);
    showMessage("går med...");

    try {
      const result = await joinHousehold({
        invite_code: inviteCode,
        display_name: displayName,
        device_key: getIdentity().device_key,
      });
      renderIdentity(identityFromApiResult(result, "Joined household"));
      form.reset();
      showMessage("du är med i hushållet");
    } catch (error) {
      if (isUnavailable(error)) {
        renderIdentity(joinLocalHousehold({ displayName, inviteCode }));
        form.reset();
        showMessage("Workern svarar inte, så koden sparades lokalt tills vidare");
      } else {
        showMessage(error.status === 404 ? "Invite code hittades inte" : "Kunde inte gå med just nu");
      }
    } finally {
      setFormBusy(form, false);
    }
  });

  householdRoot.querySelector("[data-display-name-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const displayName = valueFrom(event.currentTarget, "current-display-name");
    if (!displayName) return;

    renderIdentity(setDisplayName(displayName));
    showMessage("namnet ar uppdaterat");
  });

  householdRoot.querySelector("[data-clear-household]")?.addEventListener("click", () => {
    renderIdentity(clearIdentity());
    showMessage("hushållet är borttaget från den här enheten");
  });
}

bindHouseholdForms();
renderIdentity(getIdentity());
