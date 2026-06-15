function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function createInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

function now() {
  return new Date().toISOString();
}

export async function createHousehold(db, { name, display_name, device_key }) {
  const timestamp = now();
  const household = {
    id: createId("household"),
    name,
    invite_code: createInviteCode(),
    created_at: timestamp,
    updated_at: timestamp,
  };
  const user = {
    id: createId("user"),
    display_name,
    household_id: household.id,
    device_key,
    created_at: timestamp,
    updated_at: timestamp,
  };

  await db.batch([
    db
      .prepare(
        `
          INSERT INTO households (id, name, invite_code, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `
      )
      .bind(household.id, household.name, household.invite_code, household.created_at, household.updated_at),
    db
      .prepare(
        `
          INSERT INTO users (id, display_name, household_id, device_key, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .bind(user.id, user.display_name, user.household_id, user.device_key, user.created_at, user.updated_at),
  ]);

  return { household, user };
}

export async function joinHousehold(db, { invite_code, display_name, device_key }) {
  const household = await db
    .prepare(
      `
        SELECT id, name, invite_code, created_at, updated_at
        FROM households
        WHERE invite_code = ?
      `
    )
    .bind(invite_code)
    .first();

  if (!household) return null;

  const timestamp = now();
  const existingUser = await db
    .prepare(
      `
        SELECT id, display_name, household_id, device_key, created_at, updated_at
        FROM users
        WHERE household_id = ? AND device_key = ?
      `
    )
    .bind(household.id, device_key)
    .first();

  if (existingUser) {
    const user = {
      ...existingUser,
      display_name,
      updated_at: timestamp,
    };
    await db
      .prepare(
        `
          UPDATE users
          SET display_name = ?, updated_at = ?
          WHERE id = ?
        `
      )
      .bind(user.display_name, user.updated_at, user.id)
      .run();
    return { household, user };
  }

  const user = {
    id: createId("user"),
    display_name,
    household_id: household.id,
    device_key,
    created_at: timestamp,
    updated_at: timestamp,
  };

  await db
    .prepare(
      `
        INSERT INTO users (id, display_name, household_id, device_key, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .bind(user.id, user.display_name, user.household_id, user.device_key, user.created_at, user.updated_at)
    .run();

  return { household, user };
}

export async function getHousehold(db, householdId) {
  const household = await db
    .prepare(
      `
        SELECT id, name, invite_code, created_at, updated_at
        FROM households
        WHERE id = ?
      `
    )
    .bind(householdId)
    .first();

  if (!household) return null;

  const users = await db
    .prepare(
      `
        SELECT id, display_name, household_id, created_at, updated_at
        FROM users
        WHERE household_id = ?
        ORDER BY created_at ASC
      `
    )
    .bind(household.id)
    .all();

  return {
    household,
    users: users.results || [],
  };
}

export async function listShoppingLists(db, householdId) {
  const lists = await db
    .prepare(
      `
        SELECT id, household_id, title, created_at, updated_at
        FROM shopping_lists
        WHERE household_id = ?
        ORDER BY updated_at DESC, created_at DESC
      `
    )
    .bind(householdId)
    .all();

  return lists.results || [];
}

export async function createShoppingList(db, { household_id, title }) {
  const timestamp = now();
  const list = {
    id: createId("list"),
    household_id,
    title,
    created_at: timestamp,
    updated_at: timestamp,
  };

  await db
    .prepare(
      `
        INSERT INTO shopping_lists (id, household_id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `
    )
    .bind(list.id, list.household_id, list.title, list.created_at, list.updated_at)
    .run();

  return list;
}

export async function getShoppingList(db, listId) {
  return db
    .prepare(
      `
        SELECT id, household_id, title, created_at, updated_at
        FROM shopping_lists
        WHERE id = ?
      `
    )
    .bind(listId)
    .first();
}

export async function listShoppingItems(db, listId, { includeDeleted = false } = {}) {
  const items = await db
    .prepare(
      `
        SELECT id, list_id, text, checked, created_by, created_at, updated_at, deleted_at
        FROM shopping_items
        WHERE list_id = ?
          AND (? OR deleted_at IS NULL)
        ORDER BY checked ASC, created_at ASC
      `
    )
    .bind(listId, includeDeleted ? 1 : 0)
    .all();

  return (items.results || []).map(normalizeShoppingItem);
}

export async function createShoppingItem(db, { list_id, text, created_by = null }) {
  const timestamp = now();
  const item = {
    id: createId("item"),
    list_id,
    text,
    checked: false,
    created_by,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  };

  await db.batch([
    db
      .prepare(
        `
          INSERT INTO shopping_items (id, list_id, text, checked, created_by, created_at, updated_at, deleted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(item.id, item.list_id, item.text, 0, item.created_by, item.created_at, item.updated_at, item.deleted_at),
    db
      .prepare(
        `
          UPDATE shopping_lists
          SET updated_at = ?
          WHERE id = ?
        `
      )
      .bind(timestamp, item.list_id),
  ]);

  return item;
}

export async function getShoppingItem(db, itemId) {
  const item = await db
    .prepare(
      `
        SELECT id, list_id, text, checked, created_by, created_at, updated_at, deleted_at
        FROM shopping_items
        WHERE id = ?
      `
    )
    .bind(itemId)
    .first();

  return item ? normalizeShoppingItem(item) : null;
}

export async function updateShoppingItem(db, { item_id, text, checked }) {
  const current = await getShoppingItem(db, item_id);
  if (!current || current.deleted_at) return null;

  const timestamp = now();
  const next = {
    ...current,
    text: text ?? current.text,
    checked: checked ?? current.checked,
    updated_at: timestamp,
  };

  await db.batch([
    db
      .prepare(
        `
          UPDATE shopping_items
          SET text = ?, checked = ?, updated_at = ?
          WHERE id = ? AND deleted_at IS NULL
        `
      )
      .bind(next.text, next.checked ? 1 : 0, next.updated_at, next.id),
    db
      .prepare(
        `
          UPDATE shopping_lists
          SET updated_at = ?
          WHERE id = ?
        `
      )
      .bind(timestamp, next.list_id),
  ]);

  return next;
}

export async function softDeleteShoppingItem(db, itemId) {
  const current = await getShoppingItem(db, itemId);
  if (!current || current.deleted_at) return null;

  const timestamp = now();
  const item = {
    ...current,
    updated_at: timestamp,
    deleted_at: timestamp,
  };

  await db.batch([
    db
      .prepare(
        `
          UPDATE shopping_items
          SET updated_at = ?, deleted_at = ?
          WHERE id = ? AND deleted_at IS NULL
        `
      )
      .bind(item.updated_at, item.deleted_at, item.id),
    db
      .prepare(
        `
          UPDATE shopping_lists
          SET updated_at = ?
          WHERE id = ?
        `
      )
      .bind(timestamp, item.list_id),
  ]);

  return item;
}

export async function getHouseholdChanges(db, { household_id, since }) {
  const lists = await db
    .prepare(
      `
        SELECT id, household_id, title, created_at, updated_at
        FROM shopping_lists
        WHERE household_id = ?
          AND updated_at > ?
        ORDER BY updated_at ASC
      `
    )
    .bind(household_id, since)
    .all();

  const items = await db
    .prepare(
      `
        SELECT shopping_items.id,
               shopping_items.list_id,
               shopping_items.text,
               shopping_items.checked,
               shopping_items.created_by,
               shopping_items.created_at,
               shopping_items.updated_at,
               shopping_items.deleted_at
        FROM shopping_items
        INNER JOIN shopping_lists ON shopping_lists.id = shopping_items.list_id
        WHERE shopping_lists.household_id = ?
          AND shopping_items.updated_at > ?
        ORDER BY shopping_items.updated_at ASC
      `
    )
    .bind(household_id, since)
    .all();

  return {
    server_time: now(),
    shopping_lists: lists.results || [],
    shopping_items: (items.results || []).map(normalizeShoppingItem),
  };
}

function normalizeShoppingItem(item) {
  return {
    ...item,
    checked: Boolean(item.checked),
  };
}
