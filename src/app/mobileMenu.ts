import type { AppElements } from "../ui";

export function bindMobileMenu(elements: AppElements) {
  function setOpen(open: boolean) {
    elements.mobileMenu.classList.toggle("open", open);
    elements.menuButton?.setAttribute("aria-expanded", String(open));
    if (elements.menuScrim) elements.menuScrim.hidden = !open;
  }

  elements.menuButton?.addEventListener("click", () => setOpen(true));
  elements.closeMenuButton?.addEventListener("click", () => setOpen(false));
  elements.menuScrim?.addEventListener("click", () => setOpen(false));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}
