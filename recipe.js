document.querySelectorAll(".ingredients-list").forEach((list) => {
  const wrapper = document.createElement("div");
  wrapper.className = "ingredients-wrap";

  list.parentNode.insertBefore(wrapper, list);
  wrapper.appendChild(list);

  const button = document.createElement("button");
  button.className = "copy-ingredients";
  button.type = "button";
  button.setAttribute("aria-label", "Copy ingredients");
  button.title = "Copy ingredients";
  wrapper.appendChild(button);

  button.addEventListener("click", async () => {
    const originalLabel = button.getAttribute("aria-label");

    try {
      await navigator.clipboard.writeText(list.textContent.trim());
      button.classList.add("copied");
      button.setAttribute("aria-label", "Copied");
      button.title = "Copied";

      window.setTimeout(() => {
        button.classList.remove("copied");
        button.setAttribute("aria-label", originalLabel);
        button.title = "Copy ingredients";
      }, 1200);
    } catch {
      button.setAttribute("aria-label", "Copy failed");
      button.title = "Copy failed";
    }
  });
});
