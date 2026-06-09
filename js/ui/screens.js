export function createScreenRouter(screens) {
  let current = "home";

  function show(name) {
    if (!screens[name]) return;
    Object.values(screens).forEach((screen) => screen.classList.remove("active"));
    screens[name].classList.add("active");
    current = name;
  }

  return { show, get current() { return current; } };
}
