(function () {
  function dict(lang) {
    return (window.I18N_DICTIONARIES && window.I18N_DICTIONARIES[lang]) || {};
  }

  function lookup(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc && typeof acc === "object" ? acc[key] : undefined;
    }, obj);
  }

  function interpolate(str, vars) {
    if (!vars) return str;
    return str.replace(/\{\{(\w+)\}\}/g, function (_, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : "";
    });
  }

  function currentLang() {
    try {
      return localStorage.getItem("lang") || "en";
    } catch (e) {
      return "en";
    }
  }

  function t(key, vars) {
    var lang = currentLang();
    var value = lookup(dict(lang), key);
    if (value === undefined) value = lookup(dict("en"), key);
    if (value === undefined) return key;
    return interpolate(value, vars);
  }

  function applyStaticI18n(root) {
    root = root || document;
    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
    });
    root.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      el.title = t(el.getAttribute("data-i18n-title"));
    });
    root.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    var switcher = document.getElementById("langSwitch");
    if (switcher) switcher.value = currentLang();
  }

  function setLang(lang) {
    try {
      localStorage.setItem("lang", lang);
    } catch (e) {
      /* storage unavailable — language just won't persist */
    }
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    applyStaticI18n(document);
    document.dispatchEvent(new CustomEvent("i18nchange"));
  }

  function initI18n() {
    var lang = currentLang();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    applyStaticI18n(document);
    var switcher = document.getElementById("langSwitch");
    if (switcher) {
      switcher.value = lang;
      switcher.addEventListener("change", function () {
        setLang(switcher.value);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initI18n);
  } else {
    initI18n();
  }

  function tError(code, fallback) {
    if (!code) return fallback || "";
    var key = "errors." + String(code).replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
    var value = t(key);
    return value === key ? (fallback || code) : value;
  }

  window.t = t;
  window.tError = tError;
  window.setLang = setLang;
  window.currentLang = currentLang;
  window.applyStaticI18n = applyStaticI18n;
})();
