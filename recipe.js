const groceryStores = [
  "Coop Avenyn",
  "Willys Sten Sture",
  "Ica Focus",
  "Hemköp Kullavik",
];

const storeDepartmentRanks = {
  "Coop Avenyn": ranks({
    "veggie": 1,
    "veggies": 1,
    "deli eller burkar": 3,
    "fiskdisken": 4,
    "mejeri": 5,
    "kyl": 6,
    "konserv": 9,
    "burkar": 9,
    "burk": 9,
    "taco": 10,
    "asiatisk": 11,
    "bakning": 12,
    "vid oljorna": 13,
    "krydda": 14,
    "kryddor": 14,
    "buljong": 14,
    "nötter": 15,
    "glutenfritt": 16,
    "glutenfritt, fryst": 16,
    "te": 17,
    "fryst": 18,
    "frys": 18,
    "systemet": 19,
    "kassan": 20,
  }),
  "Willys Sten Sture": ranks({
    "veggie": 1,
    "veggies": 1,
    "deli eller burkar": 2,
    "fiskdisken": 3,
    "mejeri": 4,
    "kyl": 5,
    "asiatisk": 8,
    "taco": 9,
    "konserv": 10,
    "burkar": 11,
    "burk": 11,
    "bakning": 12,
    "krydda": 13,
    "kryddor": 13,
    "buljong": 13,
    "vid oljorna": 14,
    "glutenfritt": 15,
    "glutenfritt, fryst": 15,
    "nötter": 16,
    "fryst": 17,
    "frys": 17,
    "te": 18,
    "systemet": 19,
    "kassan": 20,
  }),
  "Ica Focus": ranks({
    "veggie": 1,
    "veggies": 1,
    "deli eller burkar": 2,
    "fiskdisken": 3,
    "mejeri": 4,
    "kyl": 5,
    "fryst": 7,
    "frys": 7,
    "konserv": 8,
    "burkar": 8,
    "burk": 8,
    "asiatisk": 9,
    "taco": 10,
    "bakning": 11,
    "vid oljorna": 12,
    "krydda": 13,
    "kryddor": 13,
    "buljong": 13,
    "nötter": 14,
    "glutenfritt": 15,
    "glutenfritt, fryst": 15,
    "te": 16,
    "kassan": 17,
    "systemet": 18,
  }),
  "Hemköp Kullavik": ranks({
    "veggie": 1,
    "veggies": 1,
    "deli eller burkar": 3,
    "fiskdisken": 4,
    "mejeri": 5,
    "kyl": 6,
    "asiatisk": 8,
    "taco": 9,
    "konserv": 10,
    "burkar": 11,
    "burk": 11,
    "buljong": 12,
    "bakning": 13,
    "vid oljorna": 14,
    "krydda": 15,
    "kryddor": 15,
    "nötter": 16,
    "glutenfritt": 17,
    "glutenfritt, fryst": 17,
    "fryst": 18,
    "frys": 19,
    "te": 20,
    "systemet": 21,
    "kassan": 22,
  }),
};

const recipeIngredients = {
  "fiskpinnetacos": [
    item("chiliflakes", "krydda", "krydda", "staple"),
    item("Fiskpinnar", "fisk", "fryst", "handla"),
    item("tortillabröd", "bröd", "taco", "handla"),
    item("majs", "burk", "konserv", "handla"),
    item("fetaost", "ost", "mejeri", "handla"),
    item("Lime", "färsk", "veggie", "handla"),
    item("Grön chilisås", "sås", "burkar", "staple"),
    item("krossade tomater", "burk", "konserv", "handla"),
    item("avocado", "färsk", "veggie", "handla"),
    item("koriander", "färsk", "veggie", "handla"),
  ],
  "den-saftiga-kycklingen": [
    item("kycklingbröst", "färsk", "kyl", "handla"),
    item("soja", "sås", "asiatisk", "staple"),
    item("ostronsås", "sås", "asiatisk", "staple"),
    item("majsstärkelse", "box", "bakning", "staple"),
    item("vitlök", "torkad", "veggies", "staple"),
    item("färsk chili", "färsk", "veggies", "handla"),
    item("sesamfrön", "torra", "kryddor", "staple"),
    item("koriander", "färsk", "veggie", "handla"),
    item("olja", "raps", "burkar", "staple"),
  ],
  "salsicciapasta": [
    item("parmesan", "ost", "mejeri", "handla"),
    item("krossade tomater", "burk", "konserv", "handla"),
    item("tomatpuré", "tub", "konserv", "staple"),
    item("vitlök", "torkad", "veggies", "staple"),
    item("gullök", "färsk", "veggie", "handla"),
    item("basilika", "färsk", "veggie", "handla"),
    item("spaghetti", "barilla", "glutenfritt", "handla"),
    item("balsamvinäger", "sås", "vid oljorna", "staple"),
  ],
  "falafelhistoria": [
    item("falafel", "fryst", "fryst", "handla"),
    item("Pitabröd, tunnbröd", "bröd", "glutenfritt, fryst", "handla"),
    item("sallad", "cosmo eller påse", "veggie", "handla"),
    item("tahini", "burk", "", "staple"),
    item("turkisk yoghurt", "burk", "mejeri", "handla"),
    item("vitlök", "torkad", "veggies", "staple"),
    item("mynta", "färsk", "veggie", "handla"),
    item("Chiliolja", "Lao gan ma", "asiatisk", "staple"),
    item("citron", "veggie", "veggie", "handla"),
    item("sumak", "krydda", "burk", "staple"),
  ],
  "sallad": [
    item("majs", "burk", "konserv", "handla"),
    item("fetaost", "ost", "mejeri", "handla"),
    item("parmesan", "ost", "mejeri", "handla"),
    item("småbladssallad", "påse", "veggie", "handla"),
    item("rödlök", "färsk", "veggie", "handla"),
    item("soltorkad tomat", "burk", "burkar", "handla"),
    item("pasta", "", "glutenfritt", "handla"),
    item("salami", "pålägg", "kyl", "handla"),
  ],
  "den-kramiga-kycklingen": [
    item("chiliflakes", "krydda", "krydda", "staple"),
    item("parmesan", "ost", "mejeri", "handla"),
    item("kycklingbröst", "färsk", "kyl", "handla"),
    item("vitlök", "torkad", "veggies", "staple"),
    item("färsk chili", "färsk", "veggies", "handla"),
    item("citron", "veggie", "veggie", "handla"),
    item("soltorkad tomat", "burk", "burkar", "handla"),
    item("babyspenat", "påse", "veggie", "handla"),
    item("färsk tomat", "färsk", "veggie", "handla"),
    item("grädde", "5 dl", "mejeri", "handla"),
  ],
  "almost-sandstorm": [
    item("färs", "", "", "handla"),
    item("vitlök", "torkad", "veggies", "staple"),
    item("crispy chili", "Lao gan ma", "asiatisk", "staple"),
    item("sichuanpeppar", "krydda, refill", "asiatisk", "staple"),
    item("spiskummin", "krydda, refill", "kryddor", "staple"),
    item("svart vinäger", "sås", "flaska", "staple"),
    item("xiaoxing wine", "matlagningsvin", "asiatisk", "staple"),
  ],
  "birria": [
    item("tortillabröd", "bröd", "taco", "handla"),
    item("majs", "burk", "konserv", "handla"),
    item("fetaost", "ost", "mejeri", "handla"),
    item("Lime", "färsk", "veggie", "handla"),
    item("krossade tomater", "burk", "konserv", "handla"),
    item("tomatpuré", "tub", "konserv", "staple"),
    item("avocado", "färsk", "veggie", "handla"),
    item("koriander", "färsk", "veggie", "handla"),
    item("vitlök", "torkad", "veggies", "staple"),
    item("gullök", "färsk", "veggie", "handla"),
    item("spiskummin", "krydda, refill", "kryddor", "staple"),
    item("Nötkött", "köttbitar", "kyl", "handla"),
    item("oregano", "burk", "kryddor", "handla"),
    item("ingefära", "färsk", "veggies", "handla"),
    item("Jalapeño", "alt. grön chili", "veggies", "handla"),
  ],
  "lax-med-oliver": [
    item("mynta", "färsk", "veggie", "handla"),
    item("citron", "veggie", "veggie", "handla"),
    item("Lax", "helst färsk", "fiskdisken", "handla"),
    item("fänkål", "färsk", "veggies", "handla"),
    item("Castelvetranooliver", "burk", "deli eller burkar", "handla"),
    item("scharlottenlök", "färsk", "veggies", "handla"),
    item("persilja", "färsk", "veggies", "handla"),
  ],
  "mormors-kottbullar": [
    item("krossade tomater", "burk", "konserv", "handla"),
    item("tomatpuré", "tub", "konserv", "staple"),
    item("vitlök", "torkad", "veggies", "staple"),
    item("gullök", "färsk", "veggie", "handla"),
    item("koriander", "färsk", "veggie", "handla"),
    item("färsk tomat", "färsk", "veggie", "handla"),
    item("ingefära", "färsk", "veggies", "handla"),
    item("Jalapeño", "alt. grön chili", "veggies", "handla"),
    item("lammfärs", "färsk", "kyl", "handla"),
    item("ris", "basmati", "", "staple"),
  ],
  "kulfi-ice-cream": [
    item("grädde", "5 dl", "mejeri", "handla"),
    item("kondenserad mjölk", "burk", "konserv", "handla"),
    item("elaichi", "kummin, gröna kapslar", "kryddor", "staple"),
    item("pistagenötter", "osaltade", "nötter", "handla"),
    item("mandel", "osaltade", "nötter", "handla"),
    item("saffran", "torkad", "kassan", "handla"),
  ],
  "masala-chai": [
    item("mynta", "färsk", "veggie", "handla"),
    item("ingefära", "färsk", "veggies", "handla"),
    item("elaichi", "kummin, gröna kapslar", "kryddor", "staple"),
    item("svart te", "lös, earl grey", "te", "staple"),
    item("socker", "vanligt", "bakning", "staple"),
    item("mjölk", "röd", "mejeri", "handla"),
    item("nutmeg", "muskot", "krydda", "handla"),
    item("cinnamon", "kanelstång", "krydda", "handla"),
    item("cloves", "nejlika", "krydda", "handla"),
    item("star anise", "stjärnanis", "krydda", "handla"),
  ],
  "moules-frites": [
    item("grädde", "5 dl", "mejeri", "handla"),
    item("vitlök", "torkad", "veggies", "staple"),
    item("scharlottenlök", "färsk", "veggies", "handla"),
    item("persilja", "färsk", "veggies", "handla"),
    item("blåmusslor", "fäska", "fiskdisken", "handla"),
    item("vitt vin", "torrt", "systemet", "handla"),
    item("kycklingfond", "flaska", "buljong", "handla"),
    item("pommes", "fryst", "frys", "handla"),
  ],
};

const majsroraIngredients = [
  item("fetaost", "ost", "mejeri", "handla"),
  item("parmesan", "ost", "mejeri", "handla"),
  item("Lime", "färsk", "veggie", "handla"),
  item("koriander", "färsk", "veggie", "handla"),
];

const recipesWithMajsrora = new Set([
  "fiskpinnetacos",
  "birria",
]);

function item(name, hint, section, notes) {
  return { name, hint, section, notes };
}

function ranks(values) {
  return Object.fromEntries(
    Object.entries(values).map(([department, rank]) => [department.toLowerCase(), rank])
  );
}

function currentRecipeSlug() {
  return window.location.pathname.split("/").pop().replace(/\.html$/, "");
}

function rankForStore(row, store) {
  if (!store || !storeDepartmentRanks[store]) return Number.POSITIVE_INFINITY;
  const section = (row.dataset.section || "").toLowerCase();
  return storeDepartmentRanks[store][section] ?? Number.POSITIVE_INFINITY;
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

function sortedShoppingRows(wrapper) {
  const store = document.querySelector("[name='grocery-store']")?.value || "";

  return [...wrapper.querySelectorAll(".ingredient-row")]
    .filter((row) => !row.hidden)
    .map((row, index) => ({ row, index, rank: rankForStore(row, store) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ row }) => row);
}

function sortVisibleIngredients(store) {
  document.querySelectorAll(".ingredient-items").forEach((list) => {
    const rows = [...list.querySelectorAll(".ingredient-row")];
    const sortedRows = rows
      .map((row, index) => ({ row, index, rank: rankForStore(row, store) }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map(({ row }) => row);

    sortedRows.forEach((row) => list.append(row));
  });
}

function renderIngredientList(list, ingredients) {
  const enhancedList = document.createElement("ul");
  enhancedList.className = "ingredients-list ingredient-items";

  ingredients.forEach((ingredient) => {
    const row = document.createElement("li");
    row.className = "ingredient-row";
    row.dataset.notes = ingredient.notes;
    row.dataset.section = ingredient.section;

    const toggle = document.createElement("button");
    toggle.className = "ingredient-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = `<span class="ingredient-name">${ingredient.name}</span>`;

    const meta = document.createElement("dl");
    meta.className = "ingredient-meta";
    meta.hidden = true;

    if (ingredient.hint) {
      meta.append(metaEntry("Hint", ingredient.hint));
    }

    if (ingredient.section) {
      meta.append(metaEntry("Avdelning", ingredient.section));
    }

    toggle.addEventListener("click", () => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!isOpen));
      meta.hidden = isOpen;
    });

    row.append(toggle, meta);
    enhancedList.append(row);
  });

  list.replaceWith(enhancedList);
  return enhancedList;
}

function addMajsroraBox(detail) {
  if (!recipesWithMajsrora.has(currentRecipeSlug())) return;

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

function metaEntry(label, value) {
  const fragment = document.createDocumentFragment();
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = label;
  dd.textContent = value;
  fragment.append(dt, dd);
  return fragment;
}

document.querySelectorAll(".recipe-detail").forEach((detail) => {
  const ingredientsSection = detail.querySelector("section");
  if (!ingredientsSection) return;

  const field = document.createElement("label");
  field.className = "store-select-field";
  field.innerHTML = `
    <span>Välj butik</span>
    <select name="grocery-store">
      <option value="">Välj mataffär</option>
      ${groceryStores.map((store) => `<option value="${store}">${store}</option>`).join("")}
    </select>
  `;

  detail.insertBefore(field, ingredientsSection);

  const staplesField = document.createElement("label");
  staplesField.className = "staples-toggle-field";
  staplesField.innerHTML = `
    <input type="checkbox" name="staples-visibility">
    <span class="staples-toggle-ui" aria-hidden="true"></span>
    <span class="staples-toggle-copy">
      <span class="staples-show">Dölj stapelvaror</span>
      <span class="staples-hide">Visa stapelvaror</span>
    </span>
  `;

  detail.insertBefore(staplesField, ingredientsSection);
  addMajsroraBox(detail);

  field.querySelector("select").addEventListener("change", (event) => {
    sortVisibleIngredients(event.target.value);
  });

  staplesField.querySelector("input").addEventListener("change", () => {
    syncStapleVisibility();
  });
});

document.querySelectorAll(".ingredients-list").forEach((list) => {
  const data = list.dataset.ingredients === "majsrora"
    ? majsroraIngredients
    : recipeIngredients[currentRecipeSlug()];
  const activeList = data ? renderIngredientList(list, data) : list;
  const wrapper = document.createElement("div");
  wrapper.className = "ingredients-wrap";

  activeList.parentNode.insertBefore(wrapper, activeList);
  wrapper.appendChild(activeList);

  const button = document.createElement("button");
  button.className = "copy-ingredients";
  button.type = "button";
  button.setAttribute("aria-label", "Copy shopping ingredients");
  button.title = "Copy shopping ingredients";
  wrapper.appendChild(button);

  button.addEventListener("click", async () => {
    const originalLabel = button.getAttribute("aria-label");
    const shoppingItems = sortedShoppingRows(wrapper)
      .map((row) => row.querySelector(".ingredient-name").textContent.trim());
  const fallback = activeList.textContent.trim();
  const copyText = (shoppingItems.length ? shoppingItems.join("\n") : fallback);

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
});

syncStapleVisibility();
