import {
  ApiError,
  createShoppingItem,
  createShoppingList,
  deleteShoppingItem,
  getHouseholdChanges,
  getShoppingItems,
  getShoppingLists,
  updateShoppingItem,
} from "./api.js";
import { getIdentity } from "./identity.js";

const POLL_INTERVAL_MS = 10000;
const DEFAULT_LIST_TITLE = "Delad inköpslista";

const root = document.querySelector("[data-synced-shopping]");
const state = {
  identity: null,
  listId: null,
  items: new Map(),
  lastSyncAt: null,
  pollId: null,
  formBound: false,
  status: "idle",
  addPending: false,
  pollPending: false,
  pendingItemIds: new Set(),
  initRequestId: 0,
};

function normalizeItemText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function itemByText(text) {
  const key = normalizeItemText(text);
  return [...state.items.values()].find((item) => normalizeItemText(item.text) === key && !item.deleted_at) || null;
}

function setMessage(message) {
  const target = root?.querySelector("[data-synced-message]");
  if (target) target.textContent = message;
}

function setStatus(status, message) {
  state.status = status;
  root?.setAttribute("data-sync-status", status);
  setMessage(message);
  updateControls();
  renderItems();
}

function canEdit() {
  return Boolean(state.listId) && !state.addPending && state.status !== "loading" && state.status !== "offline";
}

function updateControls() {
  root?.querySelectorAll("[data-synced-add], [data-synced-input]").forEach((control) => {
    control.disabled = !canEdit();
  });
}

function sortedItems() {
  return [...state.items.values()]
    .filter((item) => !item.deleted_at)
    .sort((a, b) => Number(a.checked) - Number(b.checked) || a.created_at.localeCompare(b.created_at));
}

function renderItems() {
  const list = root?.querySelector("[data-synced-items]");
  if (!list) return;

  list.replaceChildren();

  const items = sortedItems();
  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "synced-shopping-empty";
    empty.textContent = emptyText();
    list.append(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement("li");
    row.className = "synced-shopping-item";
    row.classList.toggle("is-checked", item.checked);
    row.classList.toggle("is-pending", state.pendingItemIds.has(item.id));

    const label = document.createElement("label");
    label.className = "synced-shopping-check";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.checked;
    checkbox.disabled = state.pendingItemIds.has(item.id);
    checkbox.addEventListener("change", () => toggleItem(item.id, checkbox.checked));

    const text = document.createElement("span");
    text.textContent = item.text;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "ta bort";
    remove.disabled = state.pendingItemIds.has(item.id);
    remove.addEventListener("click", () => removeItem(item.id));

    label.append(checkbox, text);
    row.append(label, remove);
    list.append(row);
  }
}

function publishSharedItems({ deletedItems = [] } = {}) {
  document.dispatchEvent(new CustomEvent("ravibange:shared-shopping-items-changed", {
    detail: {
      items: sortedItems(),
      deletedItems,
      ready: state.status === "ready",
    },
  }));
}

function emptyText() {
  if (state.status === "loading") return "hämtar listan...";
  if (state.status === "offline") return "delad lista är offline";
  if (state.status === "no-household") return "väntar på hushåll";
  if (state.status === "error") return "kunde inte visa listan";
  return "inget här än";
}

function mergeItems(items, { fromPoll = false } = {}) {
  const deletedItems = [];

  for (const item of items) {
    if (fromPoll && state.pendingItemIds.has(item.id)) {
      continue;
    }

    const current = state.items.get(item.id);
    if (current && item.updated_at < current.updated_at) {
      continue;
    }

    if (item.deleted_at) {
      state.items.delete(item.id);
      deletedItems.push(item);
      continue;
    }

    state.items.set(item.id, item);
  }
  renderItems();
  publishSharedItems({ deletedItems });
}

async function ensureDefaultList() {
  const listsResponse = await getShoppingLists(state.identity.householdId);
  const existing = listsResponse.shopping_lists?.[0];
  if (existing) {
    state.listId = existing.id;
    return existing;
  }

  const created = await createShoppingList(state.identity.householdId, {
    title: DEFAULT_LIST_TITLE,
  });
  state.listId = created.shopping_list.id;
  return created.shopping_list;
}

async function loadItems() {
  const response = await getShoppingItems(state.listId);
  state.items.clear();
  mergeItems(response.shopping_items || []);
  state.lastSyncAt = response.shopping_list?.updated_at || new Date().toISOString();
}

async function pollChanges() {
  if (!state.identity?.householdId || !state.lastSyncAt || state.pollPending) return;

  state.pollPending = true;
  try {
    const response = await getHouseholdChanges(state.identity.householdId, state.lastSyncAt);
    state.lastSyncAt = response.server_time || new Date().toISOString();
    const changedItems = (response.shopping_items || []).filter((item) => item.list_id === state.listId);
    mergeItems(changedItems, {
      fromPoll: true,
    });
    if (state.status !== "ready") {
      setStatus("ready", "synkad");
      return;
    }

    setMessage(changedItems.length ? "uppdaterad" : "synkad");
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) {
      setStatus("offline", "delad lista är offline just nu");
      return;
    }

    setStatus("error", "kunde inte synka delad lista");
  } finally {
    state.pollPending = false;
  }
}

async function addItem(event) {
  event.preventDefault();
  const input = root.querySelector("[data-synced-input]");
  const text = input.value.trim();
  if (!text || !canEdit()) return;

  state.addPending = true;
  updateControls();
  setMessage("lägger till...");
  try {
    const response = await createShoppingItem(state.listId, {
      text,
      created_by: state.identity.userId || null,
    });
    input.value = "";
    mergeItems([response.shopping_item]);
    state.lastSyncAt = response.shopping_item.updated_at;
    setStatus("ready", "tillagd");
  } catch {
    setStatus("error", "kunde inte lägga till just nu");
  } finally {
    state.addPending = false;
    updateControls();
  }
}

async function addSharedItemText(text, { checked = false } = {}) {
  const cleanText = String(text || "").trim();
  if (!cleanText || !state.listId) return null;

  const existing = itemByText(cleanText);
  if (existing) {
    if (existing.checked !== checked) {
      return toggleItem(existing.id, checked);
    }
    return existing;
  }

  const response = await createShoppingItem(state.listId, {
    text: cleanText,
    created_by: state.identity?.userId || null,
  });
  mergeItems([response.shopping_item]);
  state.lastSyncAt = response.shopping_item.updated_at;

  if (checked) {
    await toggleItem(response.shopping_item.id, true);
  }

  return response.shopping_item;
}

async function toggleItem(itemId, checked) {
  const current = state.items.get(itemId);
  if (!current || state.pendingItemIds.has(itemId)) return;

  state.pendingItemIds.add(itemId);
  state.items.set(itemId, { ...current, checked });
  renderItems();

  try {
    const response = await updateShoppingItem(itemId, { checked });
    mergeItems([response.shopping_item]);
    state.lastSyncAt = response.shopping_item.updated_at;
    setMessage("synkad");
  } catch {
    state.items.set(itemId, current);
    renderItems();
    setMessage("kunde inte uppdatera just nu");
  } finally {
    state.pendingItemIds.delete(itemId);
    renderItems();
  }
}

async function toggleSharedItemText(text, checked) {
  const existing = itemByText(text);
  if (existing) {
    await toggleItem(existing.id, checked);
    return;
  }

  await addSharedItemText(text, { checked });
}

async function removeItem(itemId) {
  const current = state.items.get(itemId);
  if (!current || state.pendingItemIds.has(itemId)) return;

  state.pendingItemIds.add(itemId);
  state.items.delete(itemId);
  renderItems();

  try {
    const response = await deleteShoppingItem(itemId);
    state.lastSyncAt = response.shopping_item.updated_at;
    publishSharedItems({ deletedItems: [response.shopping_item] });
  } catch {
    state.items.set(itemId, current);
    renderItems();
    setMessage("kunde inte ta bort just nu");
  } finally {
    state.pendingItemIds.delete(itemId);
    renderItems();
  }
}

async function importGeneratedItems(items) {
  if (!state.listId || state.status !== "ready") return;

  for (const item of items) {
    const text = String(item?.text || "").trim();
    if (!text || itemByText(text)) continue;

    try {
      await addSharedItemText(text, { checked: Boolean(item.checked) });
    } catch {
      setMessage("kunde inte dela hela inköpslistan just nu");
      return;
    }
  }
}

async function init() {
  if (!root) return;
  const requestId = state.initRequestId + 1;
  state.initRequestId = requestId;

  if (state.pollId) {
    window.clearInterval(state.pollId);
    state.pollId = null;
  }

  state.identity = getIdentity();
  if (!state.identity.householdId || state.identity.householdId.startsWith("local_")) {
    state.items.clear();
    state.listId = null;
    state.lastSyncAt = null;
    setStatus("no-household", "skapa eller gå med i ett backend-hushåll för delad lista");
    return;
  }

  if (!state.formBound) {
    root.querySelector("[data-synced-form]")?.addEventListener("submit", addItem);
    state.formBound = true;
  }

  state.listId = null;
  state.items.clear();
  state.pendingItemIds.clear();
  setStatus("loading", "hämtar delad lista...");

  try {
    await ensureDefaultList();
    if (requestId !== state.initRequestId) return;
    await loadItems();
    if (requestId !== state.initRequestId) return;
    setStatus("ready", "synkad");
    document.dispatchEvent(new CustomEvent("ravibange:shared-shopping-ready"));
    state.pollId = window.setInterval(pollChanges, POLL_INTERVAL_MS);
  } catch (error) {
    if (requestId !== state.initRequestId) return;
    if (error instanceof ApiError && error.status === 0) {
      setStatus("offline", "delad lista är offline just nu");
      return;
    }

    setStatus("error", "kunde inte hämta delad lista");
  }
}

document.addEventListener("ravibange:identity-changed", () => {
  init();
});

init();

document.addEventListener("ravibange:generated-shopping-list-rendered", (event) => {
  importGeneratedItems(event.detail?.items || []);
});

document.addEventListener("ravibange:generated-shopping-item-toggled", (event) => {
  toggleSharedItemText(event.detail?.text, Boolean(event.detail?.checked)).catch(() => {
    setMessage("kunde inte synka icheckningen just nu");
  });
});

document.addEventListener("ravibange:generated-shopping-ui-ready", () => {
  publishSharedItems();
});
