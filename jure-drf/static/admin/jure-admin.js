/**
 * JURE staff admin helpers.
 * Light is the default visual experience; dark mode remains available.
 * Does not replace Unfold/Django admin behavior.
 */
(function () {
  try {
    var stored = localStorage.getItem("adminTheme");
    if (!stored) {
      localStorage.setItem("adminTheme", JSON.stringify("light"));
      document.documentElement.classList.remove("dark");
    }
  } catch (e) {
    /* ignore private-mode storage errors */
  }

  function enhanceSearchPlaceholders() {
    var commandInput = document.getElementById("search-input-command");
    if (commandInput) {
      commandInput.setAttribute(
        "placeholder",
        "Search users, cabinets, cases, documents..."
      );
    }
  }

  function enhanceFileDropzones() {
    document.querySelectorAll("[data-jure-dropzone]").forEach(function (zone) {
      if (zone.dataset.ready === "1") return;
      var input = zone.querySelector('input[type="file"]');
      var list = zone.querySelector("[data-jure-file-list]");
      if (!input) return;
      zone.dataset.ready = "1";

      function renderFiles() {
        if (!list) return;
        list.innerHTML = "";
        var files = input.files || [];
        Array.prototype.forEach.call(files, function (file) {
          var li = document.createElement("li");
          li.textContent = file.name;
          list.appendChild(li);
        });
      }

      ["dragenter", "dragover"].forEach(function (eventName) {
        zone.addEventListener(eventName, function (event) {
          event.preventDefault();
          zone.classList.add("is-dragover");
        });
      });
      ["dragleave", "drop"].forEach(function (eventName) {
        zone.addEventListener(eventName, function () {
          zone.classList.remove("is-dragover");
        });
      });
      zone.addEventListener("drop", function (event) {
        event.preventDefault();
        if (!event.dataTransfer || !event.dataTransfer.files.length) return;
        try {
          input.files = event.dataTransfer.files;
        } catch (err) {
          /* some browsers block programmatic FileList assignment */
        }
        renderFiles();
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      input.addEventListener("change", renderFiles);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.documentElement.classList.add("jure-admin");
    enhanceSearchPlaceholders();
    enhanceFileDropzones();
  });
})();
