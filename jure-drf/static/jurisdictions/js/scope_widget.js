(function () {
  function selectedScope(root) {
    var radio = root.querySelector('[name="visibility_scope"]:checked');
    if (radio) return radio.value;
    var select = root.querySelector("#id_visibility_scope");
    return select ? select.value : null;
  }

  function closestRow(field) {
    return (
      field.closest(".form-row") ||
      field.closest(".field-jurisdiction") ||
      field.parentElement
    );
  }

  function sync(root) {
    var field = root.querySelector("#id_jurisdiction");
    if (!field) return;
    var isGlobal = selectedScope(root) === "GLOBAL";
    var row = closestRow(field);
    if (row && row !== root) {
      row.style.display = isGlobal ? "none" : "";
    }
    field.disabled = isGlobal;
    if (isGlobal) {
      field.value = "";
    }
  }

  function init() {
    var root = document.querySelector("form");
    if (!root || !root.querySelector("#id_visibility_scope, [name='visibility_scope']")) {
      return;
    }
    root.querySelectorAll('[name="visibility_scope"], #id_visibility_scope').forEach(function (el) {
      el.addEventListener("change", function () {
        sync(root);
      });
    });
    sync(root);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
