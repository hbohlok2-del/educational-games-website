function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(
      function () { return true; },
      function () { return fallbackCopy(text); }
    );
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text) {
  var ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "absolute";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  var ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (e) {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

function wireCopyButton(button, getText) {
  if (!button) return;
  button.addEventListener("click", function () {
    copyToClipboard(getText()).then(function (ok) {
      if (!ok) return;
      var label = window.t ? t("common.copied") : "Copied!";
      button.textContent = label;
      setTimeout(function () {
        button.textContent = window.t ? t("common.copy") : "Copy code";
      }, 1500);
    });
  });
}

window.copyToClipboard = copyToClipboard;
window.wireCopyButton = wireCopyButton;
