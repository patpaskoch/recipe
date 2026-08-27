/*
 * Einkaufsliste – gemeinsame Logik (im Browser gespeichert via localStorage).
 * Wird von rezept.html (Button "Auf die Einkaufsliste") und einkaufsliste.html genutzt.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "einkaufsliste_v1";
  var _zutaten = null; // Cache der zutaten.json

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function normalize(s) {
    return (s || "").toString().toLowerCase().trim();
  }

  /* --- Speicher --- */
  function getItems() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setItems(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      /* Speicher voll oder blockiert – still ignorieren */
    }
    renderBadges();
  }

  /* --- Klassifizierung --- */
  function loadZutaten() {
    if (_zutaten) return Promise.resolve(_zutaten);
    return fetch("./zutaten.json")
      .then(function (r) { return r.json(); })
      .then(function (z) { _zutaten = z; return z; })
      .catch(function () {
        _zutaten = { reihenfolge: ["Gewürze & Sonstiges"], emoji: {}, prioritaet: [], startet_mit: {}, stichworte: {} };
        return _zutaten;
      });
  }

  function classify(text, z) {
    var t = normalize(text);
    var prefixes = z.startet_mit || {};
    for (var p in prefixes) {
      if (Object.prototype.hasOwnProperty.call(prefixes, p) && t.indexOf(p) === 0) return prefixes[p];
    }
    var order = z.prioritaet && z.prioritaet.length ? z.prioritaet : z.reihenfolge || [];
    for (var i = 0; i < order.length; i++) {
      var cat = order[i];
      var words = (z.stichworte && z.stichworte[cat]) || [];
      for (var j = 0; j < words.length; j++) {
        if (t.indexOf(words[j]) !== -1) return cat;
      }
    }
    return "Gewürze & Sonstiges";
  }

  /* --- Aktionen --- */
  function addRecipe(recipe, z) {
    var items = getItems();
    var seen = {};
    items.forEach(function (i) { seen[i.recipeId + "|" + i.text] = true; });

    var added = 0;
    (recipe.ingredients || []).forEach(function (ing) {
      var text = typeof ing === "string" ? ing : ing.text;
      if (!text) return;
      var cat = (ing && typeof ing === "object" && ing.typ) ? ing.typ : classify(text, z);
      var key = recipe.id + "|" + text;
      if (seen[key]) return;
      seen[key] = true;
      items.push({
        id: uid(),
        text: text,
        category: cat,
        recipeId: recipe.id,
        recipeTitle: recipe.title || "",
        checked: false
      });
      added++;
    });
    setItems(items);
    return added;
  }

  function addManual(text, z) {
    text = (text || "").trim();
    if (!text) return null;
    var items = getItems();
    var item = {
      id: uid(),
      text: text,
      category: classify(text, z),
      recipeId: "",
      recipeTitle: "",
      checked: false
    };
    items.push(item);
    setItems(items);
    return item;
  }

  function toggle(id) {
    var items = getItems();
    items.forEach(function (i) { if (i.id === id) i.checked = !i.checked; });
    setItems(items);
  }

  function remove(id) {
    setItems(getItems().filter(function (i) { return i.id !== id; }));
  }

  function checkAll(state) {
    var items = getItems();
    items.forEach(function (i) { i.checked = state !== false; });
    setItems(items);
  }

  function removeChecked() {
    setItems(getItems().filter(function (i) { return !i.checked; }));
  }

  function clear() {
    setItems([]);
  }

  function openCount() {
    return getItems().filter(function (i) { return !i.checked; }).length;
  }

  /* --- Badge in der Navigation --- */
  function renderBadges() {
    var n = openCount();
    var nodes = document.querySelectorAll(".ek-badge");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = n;
      nodes[i].style.display = n > 0 ? "" : "none";
    }
  }

  document.addEventListener("DOMContentLoaded", renderBadges);
  window.addEventListener("storage", function (e) {
    if (e.key === STORAGE_KEY) renderBadges();
  });

  global.EK = {
    loadZutaten: loadZutaten,
    classify: classify,
    getItems: getItems,
    addRecipe: addRecipe,
    addManual: addManual,
    toggle: toggle,
    remove: remove,
    checkAll: checkAll,
    removeChecked: removeChecked,
    clear: clear,
    openCount: openCount,
    renderBadges: renderBadges
  };
})(window);
