const IDENTITY_KEY = "ravibange_identity_v1";

function createId(prefix) {
  const id = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${id}`;
}

function createInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  if (crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    bytes.forEach((_, index) => {
      bytes[index] = Math.floor(Math.random() * 256);
    });
  }
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

function readStoredIdentity() {
  try {
    const parsed = JSON.parse(localStorage.getItem(IDENTITY_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredIdentity(identity) {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function getIdentity() {
  const stored = readStoredIdentity();
  if (stored.device_key) return stored;

  const identity = {
    ...stored,
    device_key: createId("device"),
  };
  writeStoredIdentity(identity);
  return identity;
}

export function updateIdentity(updates) {
  const current = getIdentity();
  const next = {
    ...current,
    ...updates,
    device_key: current.device_key,
  };
  writeStoredIdentity(next);
  return next;
}

export function clearIdentity() {
  const { device_key } = getIdentity();
  const identity = { device_key };
  writeStoredIdentity(identity);
  return identity;
}

export function createLocalHousehold({ householdName, displayName }) {
  return updateIdentity({
    userId: createId("user"),
    displayName: displayName.trim(),
    householdId: createId("household"),
    householdName: householdName.trim(),
    inviteCode: createInviteCode(),
  });
}

export function joinLocalHousehold({ inviteCode, displayName }) {
  const normalizedInviteCode = inviteCode.trim().toUpperCase();
  return updateIdentity({
    userId: createId("user"),
    displayName: displayName.trim(),
    householdId: `local_${normalizedInviteCode}`,
    householdName: "Joined household",
    inviteCode: normalizedInviteCode,
  });
}

export function setDisplayName(displayName) {
  return updateIdentity({
    displayName: displayName.trim(),
  });
}
