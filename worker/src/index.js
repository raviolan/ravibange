import {
  createHousehold,
  createShoppingItem,
  createShoppingList,
  getHousehold,
  getHouseholdChanges,
  getShoppingList,
  joinHousehold,
  listShoppingItems,
  listShoppingLists,
  softDeleteShoppingItem,
  updateShoppingItem,
} from "./db.js";
import { error, json, notFound, preflight } from "./responses.js";

function route(pattern, pathname) {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const patternPart = patternParts[index];
    const pathPart = pathParts[index];

    if (patternPart.startsWith(":")) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
      continue;
    }

    if (patternPart !== pathPart) return null;
  }

  return params;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function textField(body, key) {
  const value = body?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => !textField(body, field));
  return missing.length ? missing : null;
}

function booleanField(body, key) {
  const value = body?.[key];
  return typeof value === "boolean" ? value : null;
}

function normalizeInviteCode(value) {
  return value.trim().toUpperCase();
}

function isValidSince(value) {
  if (!value) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime());
}

async function handleCreateHousehold(request, env) {
  const body = await readJson(request);
  const missing = requireFields(body, ["name", "display_name", "device_key"]);
  if (missing) return error(400, "Missing required fields", { missing });

  const result = await createHousehold(env.DB, {
    name: textField(body, "name"),
    display_name: textField(body, "display_name"),
    device_key: textField(body, "device_key"),
  });

  return json(result, { status: 201 });
}

async function handleJoinHousehold(request, env) {
  const body = await readJson(request);
  const missing = requireFields(body, ["invite_code", "display_name", "device_key"]);
  if (missing) return error(400, "Missing required fields", { missing });

  const result = await joinHousehold(env.DB, {
    invite_code: normalizeInviteCode(textField(body, "invite_code")),
    display_name: textField(body, "display_name"),
    device_key: textField(body, "device_key"),
  });

  if (!result) return error(404, "Invite code not found");
  return json(result);
}

async function handleGetHousehold(env, householdId) {
  const result = await getHousehold(env.DB, householdId);
  if (!result) return notFound();
  return json(result);
}

async function handleListShoppingLists(env, householdId) {
  const household = await getHousehold(env.DB, householdId);
  if (!household) return notFound();

  const shopping_lists = await listShoppingLists(env.DB, householdId);
  return json({ shopping_lists });
}

async function handleCreateShoppingList(request, env, householdId) {
  const body = await readJson(request);
  const missing = requireFields(body, ["title"]);
  if (missing) return error(400, "Missing required fields", { missing });

  const household = await getHousehold(env.DB, householdId);
  if (!household) return notFound();

  const shopping_list = await createShoppingList(env.DB, {
    household_id: householdId,
    title: textField(body, "title"),
  });

  return json({ shopping_list }, { status: 201 });
}

async function handleListShoppingItems(env, listId) {
  const list = await getShoppingList(env.DB, listId);
  if (!list) return notFound();

  const shopping_items = await listShoppingItems(env.DB, listId);
  return json({ shopping_list: list, shopping_items });
}

async function handleCreateShoppingItem(request, env, listId) {
  const body = await readJson(request);
  const missing = requireFields(body, ["text"]);
  if (missing) return error(400, "Missing required fields", { missing });

  const list = await getShoppingList(env.DB, listId);
  if (!list) return notFound();

  const shopping_item = await createShoppingItem(env.DB, {
    list_id: listId,
    text: textField(body, "text"),
    created_by: textField(body, "created_by") || textField(body, "userId") || null,
    found_in: textField(body, "found_in"),
  });

  return json({ shopping_item }, { status: 201 });
}

async function handleUpdateShoppingItem(request, env, itemId) {
  const body = await readJson(request);
  const text = Object.hasOwn(body || {}, "text") ? textField(body, "text") : null;
  const checked = booleanField(body, "checked");
  const hint = Object.hasOwn(body || {}, "hint") ? textField(body, "hint") : null;
  const section = Object.hasOwn(body || {}, "section") ? textField(body, "section") : null;
  const alternativ = Object.hasOwn(body || {}, "alternativ") ? textField(body, "alternativ") : null;
  const found_in = Object.hasOwn(body || {}, "found_in") ? textField(body, "found_in") : null;

  if (text === "" || (text == null && checked == null && hint == null && section == null && alternativ == null && found_in == null)) {
    return error(400, "Provide text, checked, hint, section, alternativ and/or found_in");
  }

  const shopping_item = await updateShoppingItem(env.DB, {
    item_id: itemId,
    text,
    checked,
    hint,
    section,
    alternativ,
    found_in,
  });

  if (!shopping_item) return notFound();
  return json({ shopping_item });
}

async function handleDeleteShoppingItem(env, itemId) {
  const shopping_item = await softDeleteShoppingItem(env.DB, itemId);
  if (!shopping_item) return notFound();

  return json({ shopping_item });
}

async function handleHouseholdChanges(env, householdId, since) {
  if (!isValidSince(since)) {
    return error(400, "Valid since timestamp is required");
  }

  const household = await getHousehold(env.DB, householdId);
  if (!household) return notFound();

  const changes = await getHouseholdChanges(env.DB, {
    household_id: householdId,
    since,
  });

  return json(changes);
}

async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return preflight();
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    return json({ ok: true, service: "ravibange-kitchen-api" });
  }

  if (request.method === "POST" && url.pathname === "/api/households") {
    return handleCreateHousehold(request, env);
  }

  if (request.method === "POST" && url.pathname === "/api/households/join") {
    return handleJoinHousehold(request, env);
  }

  const householdRoute = route("/api/households/:householdId", url.pathname);
  if (request.method === "GET" && householdRoute) {
    return handleGetHousehold(env, householdRoute.householdId);
  }

  const shoppingListsRoute = route("/api/households/:householdId/shopping-lists", url.pathname);
  if (shoppingListsRoute) {
    if (request.method === "GET") {
      return handleListShoppingLists(env, shoppingListsRoute.householdId);
    }

    if (request.method === "POST") {
      return handleCreateShoppingList(request, env, shoppingListsRoute.householdId);
    }
  }

  const changesRoute = route("/api/households/:householdId/changes", url.pathname);
  if (request.method === "GET" && changesRoute) {
    return handleHouseholdChanges(env, changesRoute.householdId, url.searchParams.get("since"));
  }

  const shoppingItemsRoute = route("/api/shopping-lists/:listId/items", url.pathname);
  if (shoppingItemsRoute) {
    if (request.method === "GET") {
      return handleListShoppingItems(env, shoppingItemsRoute.listId);
    }

    if (request.method === "POST") {
      return handleCreateShoppingItem(request, env, shoppingItemsRoute.listId);
    }
  }

  const shoppingItemRoute = route("/api/shopping-items/:itemId", url.pathname);
  if (shoppingItemRoute) {
    if (request.method === "PATCH") {
      return handleUpdateShoppingItem(request, env, shoppingItemRoute.itemId);
    }

    if (request.method === "DELETE") {
      return handleDeleteShoppingItem(env, shoppingItemRoute.itemId);
    }
  }

  return notFound();
}

export default {
  async fetch(request, env) {
    if (!env.DB) return error(500, "D1 binding DB is not configured");

    try {
      return await handleRequest(request, env);
    } catch (cause) {
      console.error(cause);
      return error(500, "Internal server error");
    }
  },
};
