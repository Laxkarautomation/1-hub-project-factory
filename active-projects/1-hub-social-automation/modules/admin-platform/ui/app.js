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
  if (view === "channels") {
    return loadChannelManager();
  }

  if (view === "providers") {
    return loadProviderManager();
  }

  const routeMap = {
    dashboard: "/api/dashboard",
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


async function loadChannelManager() {
  const data = await api("/api/admin/channels");
  const activeId = data.active?.channelId || "";

  const rows = (data.channels || []).map((channel) => {
    const isActive = channel.channelId === activeId;

    return `
      <div class="channel-card">
        <h3>${channel.name || channel.channelId}</h3>
        <p><b>ID:</b> ${channel.channelId}</p>
        <p><b>Brand:</b> ${channel.brand || ""}</p>
        <p><b>Status:</b> ${channel.status || ""}</p>
        <p><b>Platforms:</b> ${(channel.platforms || []).join(", ")}</p>
        <p><b>Language:</b> ${channel.language || ""}</p>
        <p><b>Output:</b> ${channel.outputBasePath || ""}</p>
        <button onclick="previewChannelRuntime('${channel.channelId}')">Runtime Preview</button>
        <button onclick="fillChannelForm('${channel.channelId}')">Edit</button>
        ${
          isActive
            ? "<button disabled>Active</button>"
            : `<button onclick="setActiveChannel('${channel.channelId}')">Set Active</button>`
        }
      </div>
    `;
  }).join("");

  document.getElementById("summary").innerHTML = `
    <div class="tile"><strong>Active Channel</strong><br>${activeId}</div>
    <div class="tile"><strong>Total Channels</strong><br>${(data.channels || []).length}</div>
  `;

  document.getElementById("output").innerHTML = `
    <div class="manager">
      <h2>Channel Management</h2>

      <div class="form-card">
        <h3>Create / Edit Channel</h3>
        <input id="channelId" placeholder="channelId">
        <input id="channelName" placeholder="Name">
        <input id="channelBrand" placeholder="Brand">
        <input id="channelStatus" placeholder="Status" value="active">
        <input id="channelPlatforms" placeholder="Platforms comma separated">
        <input id="channelNiche" placeholder="Niche">
        <input id="channelLanguage" placeholder="Language">
        <input id="channelOutput" placeholder="Output base path">
        <button onclick="saveChannelFromForm()">Save Channel</button>
      </div>

      <div class="channel-grid">
        ${rows}
      </div>
    </div>
  `;

  window.__channels = data.channels || [];
}

async function setActiveChannel(channelId) {
  const result = await api("/api/admin/channels/set-active", {
    method: "POST",
    body: JSON.stringify({ channelId })
  });

  show(result);
  await loadChannelManager();
}

async function previewChannelRuntime(channelId) {
  const data = await api(`/api/admin/channels/${channelId}/runtime`);
  show(data);
}

function fillChannelForm(channelId) {
  const channel = (window.__channels || []).find((item) => item.channelId === channelId);
  if (!channel) return;

  document.getElementById("channelId").value = channel.channelId || "";
  document.getElementById("channelName").value = channel.name || "";
  document.getElementById("channelBrand").value = channel.brand || "";
  document.getElementById("channelStatus").value = channel.status || "active";
  document.getElementById("channelPlatforms").value = (channel.platforms || []).join(",");
  document.getElementById("channelNiche").value = channel.niche || "";
  document.getElementById("channelLanguage").value = channel.language || "";
  document.getElementById("channelOutput").value = channel.outputBasePath || "";
}

async function saveChannelFromForm() {
  const channel = {
    channelId: document.getElementById("channelId").value.trim(),
    name: document.getElementById("channelName").value.trim(),
    brand: document.getElementById("channelBrand").value.trim(),
    status: document.getElementById("channelStatus").value.trim() || "active",
    platforms: document.getElementById("channelPlatforms").value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    niche: document.getElementById("channelNiche").value.trim(),
    language: document.getElementById("channelLanguage").value.trim(),
    outputBasePath: document.getElementById("channelOutput").value.trim()
  };

  const result = await api("/api/admin/channels/save", {
    method: "POST",
    body: JSON.stringify(channel)
  });

  show(result);
  await loadChannelManager();
}


async function loadProviderManager() {
  const data = await api("/api/admin/providers");
  const config = data.config || {};
  const dashboard = data.dashboard || {};
  const providers = dashboard.providers || [];
  const totals = dashboard.totals || {};

  document.getElementById("summary").innerHTML = `
    <div class="tile"><strong>Total Providers</strong><br>${totals.providers || providers.length}</div>
    <div class="tile"><strong>Keys</strong><br>${totals.keys || 0}</div>
    <div class="tile"><strong>Usage Success</strong><br>${totals.usageSuccess || 0}</div>
    <div class="tile"><strong>Usage Failed</strong><br>${totals.usageFailed || 0}</div>
  `;

  const grouped = providers.reduce((acc, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const sections = Object.keys(config).map((type) => {
    const providerList = grouped[type] || [];
    const active = config[type]?.active || "";
    const fallbacks = config[type]?.fallbacks || [];

    const cards = providerList.map((provider) => {
      const isActive = provider.providerId === active;

      return `
        <div class="provider-card">
          <h4>${provider.providerId}</h4>
          <p><b>Mode:</b> ${isActive ? "active" : "fallback"}</p>
          <p><b>Priority:</b> ${provider.priority || "-"}</p>
          <p><b>Enabled:</b> ${provider.enabled ? "yes" : "no"}</p>
          <p><b>Keys:</b> ${provider.keyCount || 0}</p>
          <p><b>Health:</b> ${provider.health?.status || "unknown"}</p>
          <p><b>Usage:</b> ${provider.usage?.total || 0}</p>
          ${
            isActive
              ? "<button disabled>Active</button>"
              : `<button onclick="setActiveProvider('${type}', '${provider.providerId}')">Set Active</button>`
          }
          <button onclick="showProviderDetails('${type}', '${provider.providerId}')">Details</button>
        </div>
      `;
    }).join("");

    return `
      <div class="provider-section">
        <h2>${type.toUpperCase()}</h2>
        <p><b>Active:</b> ${active}</p>
        <p><b>Fallbacks:</b> ${fallbacks.join(" → ")}</p>
        <div class="provider-grid">${cards}</div>
      </div>
    `;
  }).join("");

  document.getElementById("output").innerHTML = `
    <div class="manager">
      <h2>Provider Management</h2>
      ${sections}
    </div>
  `;

  window.__providerData = data;
}

async function setActiveProvider(type, providerId) {
  const result = await api("/api/admin/providers/set-active", {
    method: "POST",
    body: JSON.stringify({ type, providerId })
  });

  show(result);
  await loadProviderManager();
}

function showProviderDetails(type, providerId) {
  const data = window.__providerData || {};
  const provider = (data.dashboard?.providers || []).find(
    (item) => item.category === type && item.providerId === providerId
  );

  show({
    success: true,
    type,
    providerId,
    provider,
    config: data.config?.[type],
    health: data.health?.status?.[type],
    summary: (data.summary?.summary || []).find((item) => item.type === type)
  });
}
