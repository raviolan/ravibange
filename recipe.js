const SPREADSHEET_ID = "1TBldgc2G5nsNSno0KAv-PHuewv0Z_TB_WOdTS89Skgo";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq`;

const groceryStores = [
  "Coop Avenyn",
  "Willys Sten Sture",
  "Ica Focus",
  "Hemköp Kullavik",
];

const GENERAL_NAMES = new Set(["generell"]);
const GENERAL_STAPLES_SLUG = "generell-staples-inkopslista";
const MAJSRORA_SLUG = "majsrora";
const MAJSRORA_RECIPE_SLUGS = new Set(["birria", "fiskpinnetacos", "falafelhistoria"]);

const state = {
  recipeMap: new Map(),
  storeRanks: {},
  majsroraItems: [],
};

const CACHE_KEY = "ravibange_spreadsheet_cache_v2";
const INGREDIENT_CHECKS_CACHE_PREFIX = "ravibange_ingredient_checks_v1";
const GENERATED_LIST_CHECKS_CACHE_PREFIX = "ravibange_generated_ingredient_checks_v1";
const GENERATED_LIST_RECIPES_CACHE_KEY = "ravibange_generated_recipe_slugs_v1";

function loadSheet(sheetName, query = "select A,B,C,D,E,F") {
  return new Promise((resolve, reject) => {
    const callbackName = `__sheet_${sheetName}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    let finished = false;

    const cleanup = () => {
      if (finished) return;
      finished = true;
      delete window[callbackName];
      script.remove();
    };

    const fail = (error) => {
      cleanup();
      reject(error);
    };

    window[callbackName] = (response) => {
      cleanup();
      resolve(response);
    };

    script.onerror = () => fail(new Error(`Failed to load sheet: ${sheetName}`));
    script.src = `${SHEET_URL}?sheet=${encodeURIComponent(sheetName)}&tqx=responseHandler:${callbackName};out:json&tq=${encodeURIComponent(query)}`;
    document.head.append(script);

    window.setTimeout(() => {
      if (!finished) fail(new Error(`Timed out loading sheet: ${sheetName}`));
    }, 10000);
  });
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function canonicalAvdelning(value) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  if (normalized === "veggie" || normalized === "veggies" || normalized.startsWith("gronsaker")) {
    return "grönsaker";
  }
  if (normalized === "generell") {
    return "generell";
  }
  return String(value).trim();
}

function sectionRankKey(value) {
  return normalizeText(canonicalAvdelning(value));
}

function displayTag(value) {
  return canonicalAvdelning(value);
}

function cellValue(cell) {
  return cell && cell.v != null ? String(cell.v).trim() : "";
}

function rowsFromResponse(response) {
  return response?.table?.rows?.map((row) => (row.c || []).map(cellValue)) ?? [];
}

function saveCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures and continue using live data.
  }
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function ingredientChecksCacheKey(listType) {
  return `${INGREDIENT_CHECKS_CACHE_PREFIX}:${currentRecipeSlug()}:${listType}`;
}

function generatedListChecksCacheKey(recipeSlugs) {
  return `${GENERATED_LIST_CHECKS_CACHE_PREFIX}:${[...recipeSlugs].sort().join(",")}`;
}

function loadCheckedIngredientKeys(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveCheckedIngredientKeys(storageKey, checkedKeys) {
  try {
    if (checkedKeys.size) {
      localStorage.setItem(storageKey, JSON.stringify([...checkedKeys]));
      return;
    }

    localStorage.removeItem(storageKey);
  } catch {
    // Ignore storage failures; checkboxes still work for the current page view.
  }
}

function loadGeneratedRecipeSlugs() {
  try {
    const raw = localStorage.getItem(GENERATED_LIST_RECIPES_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveGeneratedRecipeSlugs(recipeSlugs) {
  try {
    if (recipeSlugs.length) {
      localStorage.setItem(GENERATED_LIST_RECIPES_CACHE_KEY, JSON.stringify(recipeSlugs));
      return;
    }

    localStorage.removeItem(GENERATED_LIST_RECIPES_CACHE_KEY);
  } catch {
    // Ignore storage failures; the generated list still works for this page view.
  }
}

function clearGeneratedListState(recipeSlugs) {
  const storageKey = generatedListChecksCacheKey(recipeSlugs);
  saveCheckedIngredientKeys(storageKey, new Set());
  saveGeneratedRecipeSlugs([]);
}

function rowKey(item) {
  return [
    normalizeText(item.name),
    normalizeText(item.hint),
    normalizeText(item.section),
    normalizeText(item.notes),
    normalizeText(item.alternativ),
    item.inMajsrora ? "majsrora" : "",
  ].join("|");
}

function aggregateKey(item) {
  return normalizeText(item.name);
}

function parseAmountPerRecipe(value) {
  if (value === "") return null;
  const amount = Number(String(value).replace(",", "."));
  return Number.isFinite(amount) ? amount : null;
}

function formatAmount(value) {
  if (!Number.isFinite(value)) return "";
  return String(Math.ceil(value));
}

function displayIngredientName(ingredient) {
  const amount = Number(ingredient.totalAmount);
  if (!Number.isFinite(amount) || amount <= 0) return ingredient.name;
  return `${ingredient.name} x ${formatAmount(amount)}`;
}

function parseRecipeSheet(rows) {
  const recipeMap = new Map();
  const generalItems = [];
  const majsroraItems = [];
  const records = [];
  const allRecipeSlugs = new Set();

  for (const row of rows.slice(1)) {
    const [recipesRaw, ingredientRaw, hintRaw, sectionRaw, notesRaw, alternativRaw, amountRaw = ""] = row;
    if (!recipesRaw || !ingredientRaw) continue;

    const item = {
      name: ingredientRaw.trim(),
      hint: String(hintRaw ?? "").trim(),
      section: displayTag(sectionRaw),
      notes: String(notesRaw ?? "").trim().toLowerCase(),
      alternativ: String(alternativRaw ?? "").trim(),
      amountPerRecipe: parseAmountPerRecipe(amountRaw),
      inMajsrora: false,
    };

    const recipeNames = recipesRaw
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    const hasGeneral = recipeNames.some((name) => GENERAL_NAMES.has(normalizeText(name)));
    const hasMajsrora = recipeNames.some((name) => normalizeText(name) === MAJSRORA_SLUG);

    const itemForRecipes = hasMajsrora ? { ...item, inMajsrora: true } : item;
    const itemForMajsrora = hasMajsrora ? { ...item, inMajsrora: true } : null;

    if (hasGeneral) {
      generalItems.push(itemForRecipes);
    }

    if (hasMajsrora) {
      majsroraItems.push(itemForMajsrora);
    }

    const targets = [];
    for (const recipeName of recipeNames) {
      const normalized = normalizeText(recipeName);
      if (!normalized || GENERAL_NAMES.has(normalized) || normalized === MAJSRORA_SLUG) {
        continue;
      }

      const slug = slugify(recipeName);
      if (!slug) continue;

      allRecipeSlugs.add(slug);
      targets.push(slug);
    }

    records.push({
      item: itemForRecipes,
      targets,
    });
  }

  for (const slug of allRecipeSlugs) {
    const bucket = [];
    for (const record of records) {
      if (record.targets.includes(slug)) {
        bucket.push(record.item);
      }
    }
    recipeMap.set(slug, dedupeItems(bucket));
  }

  recipeMap.set(GENERAL_STAPLES_SLUG, dedupeItems(generalItems));

  return {
    recipeMap,
    majsroraItems: dedupeItems(majsroraItems),
  };
}

function dedupeItems(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = rowKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function parseButikSheet(rows) {
  const headers = rows[0] || [];
  const storeRankMaps = Object.fromEntries(groceryStores.map((store) => [store, {}]));
  const storeColumnIndex = new Map();

  for (const store of groceryStores) {
    const idx = headers.findIndex((header) => normalizeText(header) === normalizeText(store));
    if (idx >= 0) storeColumnIndex.set(store, idx);
  }

  for (const row of rows.slice(1)) {
    const section = sectionRankKey(row[0]);
    if (!section) continue;

    for (const store of groceryStores) {
      const idx = storeColumnIndex.get(store);
      const rawRank = idx != null ? row[idx] : "";
      const rank = Number(rawRank);
      if (!Number.isFinite(rank)) continue;
      storeRankMaps[store][section] = rank;
    }
  }

  return storeRankMaps;
}

function currentRecipeSlug() {
  return window.location.pathname.split("/").pop().replace(/\.html$/, "");
}

function rankForStore(row, store) {
  const section = sectionRankKey(row.dataset.section);
  const rankMap = state.storeRanks[store];
  if (!rankMap || !section) return Number.POSITIVE_INFINITY;
  return rankMap[section] ?? Number.POSITIVE_INFINITY;
}

function shouldShowStaples() {
  return document.querySelector("[name='staples-visibility']")?.checked ?? false;
}

function syncStapleVisibility() {
  const showStaples = shouldShowStaples();

  document.querySelectorAll(".ingredient-row").forEach((row) => {
    row.hidden = row.dataset.notes === "staple" && !showStaples;
  });
}

function sortedIngredientRows(list, store, { includeHidden = true } = {}) {
  return [...list.querySelectorAll(".ingredient-row")]
    .filter((row) => includeHidden || !row.hidden)
    .map((row, index) => ({ row, index, rank: rankForStore(row, store) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ row }) => row);
}

function sortedRowsInList(list) {
  const store = document.querySelector("[name='grocery-store']")?.value || "";
  return sortedIngredientRows(list, store, { includeHidden: false });
}

function sortVisibleIngredients(store) {
  document.querySelectorAll(".ingredient-items").forEach((list) => {
    sortedIngredientRows(list, store).forEach((row) => list.append(row));
  });
}

function refreshVisibleIngredientOrder() {
  const store = document.querySelector("[name='grocery-store']")?.value || "";
  syncStapleVisibility();
  sortVisibleIngredients(store);
}

function metaEntry(label, value) {
  const fragment = document.createDocumentFragment();
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = label;
  dd.textContent = value;
  fragment.append(dt, dd);
  return fragment;
}

function renderIngredientList(ingredients, storageKey) {
  const ul = document.createElement("ul");
  ul.className = "ingredients-list ingredient-items";
  const checkedKeys = loadCheckedIngredientKeys(storageKey);

  ingredients.forEach((ingredient) => {
    const checkKey = rowKey(ingredient);
    const row = document.createElement("li");
    row.className = "ingredient-row";
    row.dataset.notes = ingredient.notes;
    row.dataset.section = ingredient.section;
    row.dataset.checkKey = checkKey;

    const rowHeader = document.createElement("div");
    rowHeader.className = "ingredient-row-header";

    const checkbox = document.createElement("input");
    checkbox.className = "ingredient-check";
    checkbox.type = "checkbox";
    checkbox.checked = checkedKeys.has(checkKey);
    checkbox.setAttribute("aria-label", `Markera ${ingredient.name} som handlad`);
    row.classList.toggle("is-checked", checkbox.checked);

    const toggle = document.createElement("button");
    toggle.className = "ingredient-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");

    const ingredientName = document.createElement("span");
    ingredientName.className = "ingredient-name";
    ingredientName.textContent = displayIngredientName(ingredient);
    toggle.append(ingredientName);

    const meta = document.createElement("dl");
    meta.className = "ingredient-meta";
    meta.hidden = true;

    if (ingredient.hint) {
      meta.append(metaEntry("Hint:", ingredient.hint));
    }

    if (ingredient.section) {
      meta.append(metaEntry("Avdelning:", ingredient.section));
    }

    if (ingredient.alternativ) {
      meta.append(metaEntry("Alternativ:", ingredient.alternativ));
    }

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      meta.hidden = open;
    });

    checkbox.addEventListener("change", () => {
      row.classList.toggle("is-checked", checkbox.checked);
      if (checkbox.checked) {
        checkedKeys.add(checkKey);
      } else {
        checkedKeys.delete(checkKey);
      }
      saveCheckedIngredientKeys(storageKey, checkedKeys);
    });

    rowHeader.append(checkbox, toggle);
    row.append(rowHeader, meta);
    ul.append(row);
  });

  return ul;
}

function recipeSlugFromLink(link) {
  const href = link?.getAttribute("href") || "";
  const filename = href.split("/").pop() || "";
  return filename.replace(/\.html$/, "");
}

function getSelectedRecipeSlugs() {
  return [...document.querySelectorAll(".recipe-select-input:checked")]
    .map((checkbox) => checkbox.dataset.recipeSlug)
    .filter(Boolean);
}

function itemsForShoppingRecipe(slug) {
  const items = [...(state.recipeMap.get(slug) || [])];

  if (MAJSRORA_RECIPE_SLUGS.has(slug)) {
    items.push(...state.majsroraItems);
  }

  return dedupeItems(items);
}

function aggregateShoppingItems(recipeSlugs) {
  const grouped = new Map();

  for (const slug of recipeSlugs) {
    for (const item of itemsForShoppingRecipe(slug)) {
      const key = aggregateKey(item);
      if (!key) continue;

      if (!grouped.has(key)) {
        grouped.set(key, {
          item: { ...item, inMajsrora: false },
          totalAmount: 0,
        });
      }

      const group = grouped.get(key);
      if (Number.isFinite(item.amountPerRecipe)) {
        group.totalAmount += item.amountPerRecipe;
      }
    }
  }

  return [...grouped.values()].map((group) => ({
    ...group.item,
    totalAmount: group.totalAmount > 0 ? group.totalAmount : null,
  }));
}

function updateShoppingBuilderState() {
  const selectedCount = getSelectedRecipeSlugs().length;
  const button = document.querySelector(".shopping-generate");
  const count = document.querySelector(".shopping-count");

  if (button) {
    button.disabled = selectedCount === 0;
    button.textContent = selectedCount
      ? `skapa inköpslista (${selectedCount})`
      : "välj recept först";
  }

  if (count) {
    count.textContent = selectedCount
      ? `${selectedCount} recept ${selectedCount === 1 ? "valt" : "valda"}`
      : "inga recept valda";
  }
}

function renderGeneratedShoppingList() {
  const output = document.querySelector(".shopping-output");
  if (!output) return;

  const selectedSlugs = getSelectedRecipeSlugs();
  saveGeneratedRecipeSlugs(selectedSlugs);
  const items = aggregateShoppingItems(selectedSlugs);
  const previousWrapper = output.querySelector(".ingredients-wrap");
  previousWrapper?.remove();

  const empty = output.querySelector(".shopping-empty");
  if (!items.length) {
    if (empty) empty.hidden = false;
    return;
  }

  if (empty) empty.hidden = true;

  const placeholder = document.createElement("pre");
  placeholder.className = "ingredients-list";
  output.append(placeholder);
  const storageKey = generatedListChecksCacheKey(selectedSlugs);
  const renderedList = renderIngredientList(items, storageKey);
  wrapIngredientList(placeholder, renderedList, storageKey);
  addDiscardGeneratedListControl(output.querySelector(".ingredients-wrap"), selectedSlugs);
  refreshVisibleIngredientOrder();
}

function restoreGeneratedShoppingList() {
  const savedSlugs = new Set(loadGeneratedRecipeSlugs());
  if (!savedSlugs.size) return;

  document.querySelectorAll(".recipe-select-input").forEach((checkbox) => {
    checkbox.checked = savedSlugs.has(checkbox.dataset.recipeSlug);
  });

  updateShoppingBuilderState();
  renderGeneratedShoppingList();
}

function addRecipeSelectionControls() {
  document.querySelectorAll(".recipe").forEach((recipe) => {
    if (recipe.querySelector(".recipe-select-field")) return;

    const link = recipe.querySelector("h3 a");
    const slug = recipeSlugFromLink(link);
    if (!slug) return;

    const label = document.createElement("label");
    label.className = "recipe-select-field";
    label.title = "Lägg till i inköpslistan";
    label.innerHTML = `
      <input class="recipe-select-input" type="checkbox" data-recipe-slug="${slug}">
      <span class="recipe-select-box" aria-hidden="true"></span>
    `;

    recipe.prepend(label);
  });
}

function renderIndexPage() {
  const poster = document.querySelector(".poster");
  if (!poster || document.querySelector(".recipe-detail")) return;

  addRecipeSelectionControls();

  if (!document.querySelector(".shopping-builder")) {
    const section = document.createElement("section");
    section.className = "shopping-builder";
    section.setAttribute("aria-label", "Skapa inköpslista");
    section.innerHTML = `
      <div class="shopping-builder-inner">
        <p class="vampiro shopping-title">inköpslistan</p>
        <p class="shopping-count">inga recept valda</p>
        <button class="shopping-generate" type="button" disabled>välj recept först</button>
        <div class="shopping-output" aria-live="polite">
          <p class="shopping-empty">välj några recept och skapa en stökfri lista</p>
        </div>
      </div>
    `;
    poster.append(section);

    addStoreControls(section.querySelector(".shopping-builder-inner"), section.querySelector(".shopping-output"));
    section.querySelector(".shopping-generate").addEventListener("click", renderGeneratedShoppingList);
  }

  document.querySelectorAll(".recipe-select-input").forEach((checkbox) => {
    checkbox.addEventListener("change", updateShoppingBuilderState);
  });

  updateShoppingBuilderState();
  restoreGeneratedShoppingList();
}

function addDiscardGeneratedListControl(wrapper, recipeSlugs) {
  if (!wrapper) return;

  const clearButton = wrapper.querySelector(".clear-ingredient-checks");
  const actions = document.createElement("div");
  actions.className = "generated-list-actions";

  if (clearButton) {
    wrapper.insertBefore(actions, clearButton);
    actions.append(clearButton);
  } else {
    wrapper.append(actions);
  }

  const discardButton = document.createElement("button");
  discardButton.className = "discard-generated-list";
  discardButton.type = "button";
  discardButton.textContent = "släng inköpslistan";

  const dialog = document.createElement("dialog");
  dialog.className = "clear-checks-dialog";
  dialog.innerHTML = `
    <form method="dialog">
      <p>nu raderar vi hela den här listan, oki?</p>
      <div class="clear-checks-actions">
        <button class="clear-checks-confirm" value="confirm">JA SLÄNG</button>
        <button class="clear-checks-cancel" value="cancel">NEJ BEHÅLL</button>
      </div>
    </form>
  `;

  discardButton.addEventListener("click", () => {
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      return;
    }

    if (window.confirm("nu raderar vi hela den här listan, oki?")) {
      discardGeneratedList(wrapper, recipeSlugs);
    }
  });

  dialog.addEventListener("close", () => {
    if (dialog.returnValue === "confirm") {
      discardGeneratedList(wrapper, recipeSlugs);
    }
  });

  actions.append(discardButton);
  wrapper.append(dialog);
}

function discardGeneratedList(wrapper, recipeSlugs) {
  clearGeneratedListState(recipeSlugs);

  document.querySelectorAll(".recipe-select-input:checked").forEach((checkbox) => {
    checkbox.checked = false;
  });

  wrapper.remove();

  const empty = document.querySelector(".shopping-empty");
  if (empty) {
    empty.hidden = false;
  }

  updateShoppingBuilderState();
}

function addMajsroraBox(detail) {
  if (!MAJSRORA_RECIPE_SLUGS.has(currentRecipeSlug())) return;

  const mainSection = detail.querySelector("section");
  if (!mainSection) return;

  const section = document.createElement("section");
  section.className = "sub-recipe-section";
  section.innerHTML = `
    <h2>den berömda majsröran</h2>
    <pre class="ingredients-list" data-ingredients="majsrora"></pre>
  `;

  mainSection.insertAdjacentElement("afterend", section);
}

function addStoreControls(detail, anchor) {
  const field = document.createElement("label");
  field.className = "store-select-field";
  field.innerHTML = `
    <span>Välj butik</span>
    <select name="grocery-store">
      <option value="">Välj mataffär</option>
      ${groceryStores.map((store) => `<option value="${store}">${store}</option>`).join("")}
    </select>
  `;

  const staplesField = document.createElement("label");
  staplesField.className = "staples-toggle-field";
  staplesField.innerHTML = `
    <input type="checkbox" name="staples-visibility">
    <span class="staples-option staples-option-show">stapelvaror borta</span>
    <span class="staples-toggle-ui" aria-hidden="true"></span>
    <span class="staples-option staples-option-hide">stapelvaror syns</span>
  `;

  detail.insertBefore(staplesField, anchor);
  detail.insertBefore(field, staplesField);

  field.querySelector("select").addEventListener("change", refreshVisibleIngredientOrder);

  staplesField.querySelector("input").addEventListener("change", () => {
    refreshVisibleIngredientOrder();
  });
}

function addCopyButton(wrapper) {
  const button = document.createElement("button");
  button.className = "copy-ingredients";
  button.type = "button";
  button.setAttribute("aria-label", "Copy shopping ingredients");
  button.title = "Copy shopping ingredients";
  wrapper.appendChild(button);

  button.addEventListener("click", async () => {
    const originalLabel = button.getAttribute("aria-label");
    const shoppingItems = sortedRowsInList(wrapper).map((row) =>
      row.querySelector(".ingredient-name").textContent.trim(),
    );
    const copyText = shoppingItems.join("\n");

    try {
      await navigator.clipboard.writeText(copyText);
      button.classList.add("copied");
      button.setAttribute("aria-label", "Copied");
      button.title = "Copied";

      window.setTimeout(() => {
        button.classList.remove("copied");
        button.setAttribute("aria-label", originalLabel);
        button.title = "Copy shopping ingredients";
      }, 1200);
    } catch {
      button.setAttribute("aria-label", "Copy failed");
      button.title = "Copy failed";
    }
  });
}

function addClearChecksControl(wrapper) {
  const clearButton = document.createElement("button");
  clearButton.className = "clear-ingredient-checks";
  clearButton.type = "button";
  clearButton.textContent = "ta bort alla icheckningar";

  const dialog = document.createElement("dialog");
  dialog.className = "clear-checks-dialog";
  dialog.innerHTML = `
    <form method="dialog">
      <p>är du säker på att du vill ta bort alla icheckningar?? haru handlat klart osv??</p>
      <div class="clear-checks-actions">
        <button class="clear-checks-confirm" value="confirm">JA TA BORT</button>
        <button class="clear-checks-cancel" value="cancel">NEJ FÖR FAN AVBRYT!!!</button>
      </div>
    </form>
  `;

  clearButton.addEventListener("click", () => {
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      return;
    }

    if (window.confirm("är du säker på att du vill ta bort alla icheckningar?? haru handlat klart osv??")) {
      clearIngredientChecks(wrapper);
    }
  });

  dialog.addEventListener("close", () => {
    if (dialog.returnValue === "confirm") {
      clearIngredientChecks(wrapper);
    }
  });

  wrapper.append(clearButton, dialog);
}

function clearIngredientChecks(wrapper) {
  const storageKey = wrapper.dataset.checksStorageKey;
  wrapper.querySelectorAll(".ingredient-check:checked").forEach((checkbox) => {
    checkbox.checked = false;
    checkbox.closest(".ingredient-row")?.classList.remove("is-checked");
  });
  if (storageKey) {
    saveCheckedIngredientKeys(storageKey, new Set());
  }
}

function wrapIngredientList(placeholder, renderedList, storageKey) {
  const wrapper = document.createElement("div");
  wrapper.className = "ingredients-wrap";
  wrapper.dataset.checksStorageKey = storageKey;

  placeholder.parentNode.insertBefore(wrapper, placeholder);
  placeholder.remove();
  wrapper.appendChild(renderedList);
  addCopyButton(wrapper);
  addClearChecksControl(wrapper);
}

async function bootstrap() {
  document.querySelectorAll(".ingredients-list").forEach((list) => {
    list.textContent = "";
  });

  try {
    const [recipeResponse, butikResponse] = await Promise.all([
      loadSheet("recipe", "select A,B,C,D,E,F,G"),
      loadSheet("butik"),
    ]);

    const recipeRows = rowsFromResponse(recipeResponse);
    const butikRows = rowsFromResponse(butikResponse);

    saveCache({ recipeRows, butikRows, fetchedAt: Date.now() });
    applySpreadsheetData(recipeRows, butikRows, { source: "live" });
  } catch (error) {
    const cached = loadCache();
    if (cached?.recipeRows?.length && cached?.butikRows?.length) {
      applySpreadsheetData(cached.recipeRows, cached.butikRows, { source: "cache" });
      return;
    }

    throw error;
  }
}

function applySpreadsheetData(recipeRows, butikRows, { source }) {
  const parsedRecipe = parseRecipeSheet(recipeRows);
  state.recipeMap = parsedRecipe.recipeMap;
  state.majsroraItems = parsedRecipe.majsroraItems;
  state.storeRanks = parseButikSheet(butikRows);

  renderCurrentRecipePage(source);
  renderIndexPage();
}

function renderCurrentRecipePage(source = "live") {
  const detail = document.querySelector(".recipe-detail");
  if (!detail) return;

  const ingredientsAnchor = detail.querySelector("section");
  if (!ingredientsAnchor) return;

  addStoreControls(detail, ingredientsAnchor);
  addMajsroraBox(detail);

  document.querySelectorAll(".ingredients-list").forEach((list) => {
    const isMajsrora = list.dataset.ingredients === MAJSRORA_SLUG;
    const items = isMajsrora
      ? state.majsroraItems
      : state.recipeMap.get(currentRecipeSlug()) || [];
    const listType = isMajsrora ? MAJSRORA_SLUG : "main";
    const storageKey = ingredientChecksCacheKey(listType);

    const renderedList = renderIngredientList(items, storageKey);
    wrapIngredientList(list, renderedList, storageKey);
  });

  refreshVisibleIngredientOrder();

  if (source === "cache") {
    const note = document.createElement("p");
    note.className = "recipe-cache-note";
    note.textContent = "Visar sparad version.";
    detail.insertBefore(note, detail.querySelector(".store-select-field"));
  }
}

bootstrap().catch((error) => {
  const detail = document.querySelector(".recipe-detail");
  if (detail) {
    detail.innerHTML = `
      <a class="back-link" href="../index.html">Tillbaka</a>
      <p class="recipe-error">Kunde inte läsa kalkylarket och ingen sparad version fanns.</p>
    `;
  }
  console.error(error);
});
