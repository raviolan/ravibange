const DEFAULT_LOCAL_API_BASE_URL = "http://127.0.0.1:8787";
const DEPLOYED_API_BASE_URL = "";

export class ApiError extends Error {
  constructor(message, { status = 0 } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function configuredBaseUrl() {
  const override = localStorage.getItem("ravibange_api_base_url");
  if (override) return override.replace(/\/+$/, "");

  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return DEFAULT_LOCAL_API_BASE_URL;
  }

  return DEPLOYED_API_BASE_URL;
}

async function requestJson(path, options = {}) {
  const baseUrl = configuredBaseUrl();
  const url = `${baseUrl}${path}`;
  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("Ravibange API is unavailable", { status: 0 });
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // Empty or invalid JSON responses are handled by status below.
  }

  if (!response.ok) {
    const message = body?.error?.message || "Ravibange API request failed";
    throw new ApiError(message, { status: response.status });
  }

  return body;
}

export function createHousehold({ name, display_name, device_key }) {
  return requestJson("/api/households", {
    method: "POST",
    body: JSON.stringify({ name, display_name, device_key }),
  });
}

export function joinHousehold({ invite_code, display_name, device_key }) {
  return requestJson("/api/households/join", {
    method: "POST",
    body: JSON.stringify({ invite_code, display_name, device_key }),
  });
}

export function getShoppingLists(householdId) {
  return requestJson(`/api/households/${encodeURIComponent(householdId)}/shopping-lists`);
}

export function createShoppingList(householdId, { title }) {
  return requestJson(`/api/households/${encodeURIComponent(householdId)}/shopping-lists`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function getShoppingItems(listId) {
  return requestJson(`/api/shopping-lists/${encodeURIComponent(listId)}/items`);
}

export function createShoppingItem(listId, { text, created_by }) {
  return requestJson(`/api/shopping-lists/${encodeURIComponent(listId)}/items`, {
    method: "POST",
    body: JSON.stringify({ text, created_by }),
  });
}

export function updateShoppingItem(itemId, updates) {
  return requestJson(`/api/shopping-items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteShoppingItem(itemId) {
  return requestJson(`/api/shopping-items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  });
}

export function getHouseholdChanges(householdId, since) {
  const params = new URLSearchParams({ since });
  return requestJson(`/api/households/${encodeURIComponent(householdId)}/changes?${params}`);
}
