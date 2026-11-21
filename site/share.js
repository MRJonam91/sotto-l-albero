const button = document.querySelector("#copy-link");
const manual = document.querySelector("#manual-copy");
const field = manual.querySelector("input");
const status = document.querySelector("#copy-status");

button.hidden = false;
manual.hidden = true;

button.addEventListener("click", async () => {
  status.textContent = "";
  try {
    await navigator.clipboard.writeText(field.value);
    manual.hidden = true;
    status.textContent = button.dataset.success;
  } catch {
    manual.hidden = false;
    field.focus();
    field.select();
  }
});
