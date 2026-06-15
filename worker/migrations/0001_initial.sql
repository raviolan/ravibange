CREATE TABLE households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  household_id TEXT NOT NULL,
  device_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  UNIQUE (household_id, device_key)
);

CREATE TABLE shopping_lists (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE shopping_items (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL,
  text TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_households_invite_code ON households(invite_code);
CREATE INDEX idx_users_household_id ON users(household_id);
CREATE INDEX idx_shopping_lists_household_id ON shopping_lists(household_id);
CREATE INDEX idx_shopping_items_list_id_updated_at ON shopping_items(list_id, updated_at);
