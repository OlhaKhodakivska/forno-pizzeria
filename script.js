"use strict";
document.documentElement.classList.add("js");
document.getElementById("year").textContent = new Date().getFullYear();
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.getElementById("navigation");
const mobile = window.matchMedia("(max-width: 700px)");
menuButton.hidden = false;
function closeMenu() {
  navigation.classList.remove("is-open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Menü öffnen");
}
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  navigation.classList.toggle("is-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
});
navigation.addEventListener("click", event => { if (event.target.closest("a")) closeMenu(); });
document.addEventListener("click", event => { if (!event.target.closest(".header")) closeMenu(); });
mobile.addEventListener("change", closeMenu);
window.addEventListener("pageshow", closeMenu);

const filters = [...document.querySelectorAll("[data-filter]")];
const dishes = [...document.querySelectorAll("[data-category]")];
function showCategory(category) {
  filters.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === category)));
  dishes.forEach(dish => { dish.hidden = dish.dataset.category !== category; });
}
filters.forEach(button => button.addEventListener("click", () => showCategory(button.dataset.filter)));
document.querySelectorAll("[data-menu-link]").forEach(link => link.addEventListener("click", () => showCategory(link.dataset.menuLink)));

const reservationDialog = document.getElementById("reservation-dialog");
const demoDialog = document.getElementById("demo-dialog");
const form = document.getElementById("reservation-form");
const dateField = document.getElementById("guest-date");
const timeField = document.getElementById("guest-time");
const status = document.getElementById("reservation-status");
const returnTargets = new WeakMap();
function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
// One rule set for the displayed choices and submission validation.
function getOpeningHours(dateValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const day = new Date(`${dateValue}T12:00:00`).getDay();
  if (!Number.isInteger(day) || day === 1) return null;
  return { start: (day === 0 || day >= 5 ? 12 : 17) * 60, end: 22 * 60 };
}
function isReservationTimeAllowed(dateValue, timeValue) {
  const hours = getOpeningHours(dateValue);
  if (!hours || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(timeValue)) return false;
  const [hour, minute] = timeValue.split(":").map(Number);
  const value = hour * 60 + minute;
  return value >= hours.start && value < hours.end && value % 30 === 0;
}
function updateTimes() {
  timeField.replaceChildren(new Option("Bitte wählen", ""));
  timeField.disabled = true;
  dateField.setCustomValidity("");

  if (!dateField.value) return;
  const hours = getOpeningHours(dateField.value);
  if (!hours) {
    dateField.setCustomValidity("Montags ist Ruhetag. Bitte wählen Sie einen anderen Tag.");

    return;
  }


  for (let minutes = hours.start; minutes < hours.end; minutes += 30) {
    const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    if (new Date(`${dateField.value}T${time}:00`).getTime() <= Date.now()) continue;
    timeField.add(new Option(`${time} Uhr`, time));
  }
  timeField.disabled = timeField.options.length === 1;
  if (timeField.disabled) {
    dateField.setCustomValidity("Heute sind keine Anfragezeiten mehr verfügbar. Bitte wählen Sie einen anderen Tag.");

  }
}
function openDialog(dialog, trigger) {
  returnTargets.set(dialog, mobile.matches && trigger.closest(".navigation") ? menuButton : trigger);
  closeMenu();
  dialog.showModal();
  document.documentElement.classList.add("modal-open");
}
document.querySelectorAll("[data-reserve]").forEach(button => button.addEventListener("click", () => {
  form.reset();
  form.querySelectorAll("input, select, textarea").forEach(input => input.setCustomValidity(""));
  status.textContent = "";
  dateField.min = today();
  updateTimes();
  openDialog(reservationDialog,button);
  document.getElementById("guest-name").focus();
}));
document.getElementById("demo-phone").addEventListener("click", event => openDialog(demoDialog,event.currentTarget));
document.getElementById("demo-dismiss").addEventListener("click", () => demoDialog.close());
[reservationDialog,demoDialog].forEach(dialog => {
  dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    document.documentElement.classList.remove("modal-open");
    returnTargets.get(dialog)?.focus({preventScroll:true});
  });
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const box=dialog.getBoundingClientRect();
    if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();
  });
});
document.addEventListener("keydown", event => {
  if(event.key!=="Escape")return;
  const dialog=[reservationDialog,demoDialog].find(item=>item.open);
  if(dialog){event.preventDefault();dialog.close();}
  else if(menuButton.getAttribute("aria-expanded")==="true"){closeMenu();menuButton.focus();}
});
form.addEventListener("input", event => {
  event.target.setCustomValidity("");
  status.textContent="";
});
dateField.addEventListener("change",updateTimes);
form.addEventListener("submit",event=>{
  event.preventDefault();
  const name=document.getElementById("guest-name");
  name.value=name.value.trim();
  name.setCustomValidity(name.value.length<2?"Bitte geben Sie Ihren Namen mit mindestens 2 Zeichen ein.":"");
  const appointment=new Date(`${dateField.value}T${timeField.value}:00`);
  timeField.setCustomValidity("");
  if (!isReservationTimeAllowed(dateField.value, timeField.value)) {
    timeField.setCustomValidity("Bitte wählen Sie eine angebotene Uhrzeit innerhalb unserer Öffnungszeiten.");
    dateField.setCustomValidity(getOpeningHours(dateField.value) ? "" : "Bitte wählen Sie einen Öffnungstag. Montags ist Ruhetag.");
  } else if (appointment.getTime() <= Date.now()) {
    timeField.setCustomValidity("Bitte wählen Sie einen zukünftigen Zeitpunkt.");
  }
  dateField.min=today();
  if(!form.reportValidity())return;
  const displayDate=new Intl.DateTimeFormat("de-DE",{dateStyle:"long"}).format(appointment);
  status.textContent=`Ihre Demo-Anfrage für den ${displayDate} um ${timeField.value} Uhr ist vollständig. Es wurde nichts versendet und kein Tisch reserviert.`;
});

// Observe stationary sections; animate their contents so movement cannot
// accidentally trigger another intersection and make the section flicker.
(() => {
  if (!("IntersectionObserver" in window) || !Element.prototype.animate) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sections = [...document.querySelectorAll("main > section:not(.hero), main > figure")];
  const active = new Map();
  const visible = new Set();

  function cancelSection(section) {
    (active.get(section) || []).forEach(animation => animation.cancel());
    active.delete(section);
  }
  function animateSection(section) {
    cancelSection(section);
    const index = sections.indexOf(section);
    const distance = window.matchMedia("(max-width: 700px)").matches ? 32 : 64;
    const offset = index % 2 === 0 ? -distance : distance;
    const targets = section.matches(".ingredients")
      ? [section.querySelector(".ingredients-inner")]
      : section.matches(".gather")
        ? [section.querySelector(".gather-inner")]
        : [...section.children];
    const animations = targets.filter(Boolean).map(target => target.animate([
      { opacity: 0, transform: `translateX(${offset}px)` },
      { opacity: 1, transform: "translateX(0)" },
    ], {
      duration: 950,
      easing: "cubic-bezier(.16, 1, .3, 1)",
    }));
    active.set(section, animations);
    Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (active.get(section) === animations) active.delete(section);
    });
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (!visible.has(entry.target) && !reducedMotion.matches) animateSection(entry.target);
        visible.add(entry.target);
      } else {
        visible.delete(entry.target);
        cancelSection(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -24px 0px", threshold: 0 });

  function configureMotion() {
    observer.disconnect();
    sections.forEach(cancelSection);
    visible.clear();
    if (!reducedMotion.matches) sections.forEach(section => observer.observe(section));
  }
  reducedMotion.addEventListener("change", configureMotion);
  configureMotion();
})();
