let token = localStorage.getItem("adminToken") || "";

function show(data) {
  document.getElementById("output").textContent =
    JSON.stringify(data, null, 2);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    }
  });

  return response.json();
}

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const result = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      username,
      password
    })
  });

  if (!result.success) {
    document.getElementById("loginMessage").textContent =
      result.error || "Login failed";
    return;
  }

  token = result.token;
  localStorage.setItem("adminToken", token);

  document.getElementById("login").classList.add("hidden");
  document.getElementById("panel").classList.remove("hidden");

  loadView("dashboard");
}

function buildSummary(data) {
  const summary = document.getElementById("summary");

  summary.innerHTML = "";

  const cards = [
    ["Channels", data.channels?.registry?.length || 0],
    ["Jobs", data.jobs?.queue?.length || 0],
    ["Reports", data.workflow?.reports?.length || 0],
    ["Providers", Object.keys(data.providers?.config || {}).length]
  ];

  cards.forEach(([title, value]) => {
    const div = document.createElement("div");
    div.className = "tile";
    div.innerHTML = `<strong>${title}</strong><br>${value}`;
    summary.appendChild(div);
  });
}

async function loadView(view) {
  const routeMap = {
    dashboard: "/api/dashboard",
    channels: "/api/channels",
    providers: "/api/providers",
    jobs: "/api/jobs",
    reports: "/api/reports",
    settings: "/api/settings"
  };

  const data = await api(routeMap[view]);

  if (view === "dashboard") {
    buildSummary(data);
  }

  show(data);
}

if (token) {
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("login").classList.add("hidden");
    document.getElementById("panel").classList.remove("hidden");
    loadView("dashboard");
  });
}
