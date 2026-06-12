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

  if (view === "runtime") {
    return loadRuntimeControls();
  }

  if (view === "settings") {
    return loadSettingsEditor();
  }

  if (view === "publishing") {
    return loadPublishingManager();
  }

  const routeMap = {
    dashboard: "/api/dashboard",
    jobs: "/api/jobs",
    reports: "/api/reports"
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


async function loadRuntimeControls() {
  const data = await api("/api/admin/runtime");
  const runtime = data.runtime || {};
  const controls = runtime.controls || {};

  document.getElementById("summary").innerHTML = `
    <div class="tile"><strong>Runtime</strong><br>${runtime.paused ? "Paused" : "Running"}</div>
    <div class="tile"><strong>Pipeline Run</strong><br>${controls.allowPipelineRun ? "Allowed" : "Blocked"}</div>
    <div class="tile"><strong>Job Retry</strong><br>${controls.allowJobRetry ? "Allowed" : "Blocked"}</div>
    <div class="tile"><strong>Switching</strong><br>
      Channel: ${controls.allowChannelSwitch ? "Allowed" : "Blocked"}<br>
      Provider: ${controls.allowProviderSwitch ? "Allowed" : "Blocked"}
    </div>
  `;

  document.getElementById("output").innerHTML = `
    <div class="manager">
      <h2>Runtime Controls</h2>

      <div class="runtime-card">
        <h3>Status</h3>
        <p><b>Paused:</b> ${runtime.paused ? "Yes" : "No"}</p>
        <p><b>Reason:</b> ${runtime.reason || "-"}</p>
        <p><b>Updated:</b> ${runtime.updatedAt || "-"}</p>
        <button onclick="pauseRuntimeFromUi()">Pause Runtime</button>
        <button onclick="resumeRuntimeFromUi()">Resume Runtime</button>
      </div>

      <div class="runtime-card">
        <h3>Control Flags</h3>

        <label>
          <input type="checkbox" id="allowPipelineRun" ${controls.allowPipelineRun ? "checked" : ""}>
          Allow Pipeline Run
        </label>

        <label>
          <input type="checkbox" id="allowJobRetry" ${controls.allowJobRetry ? "checked" : ""}>
          Allow Job Retry
        </label>

        <label>
          <input type="checkbox" id="allowProviderSwitch" ${controls.allowProviderSwitch ? "checked" : ""}>
          Allow Provider Switch
        </label>

        <label>
          <input type="checkbox" id="allowChannelSwitch" ${controls.allowChannelSwitch ? "checked" : ""}>
          Allow Channel Switch
        </label>

        <button onclick="saveRuntimeControls()">Save Runtime Controls</button>
      </div>
    </div>
  `;
}

async function pauseRuntimeFromUi() {
  const reason = prompt("Pause reason?", "Paused from admin UI") || "Paused from admin UI";

  const result = await api("/api/admin/runtime/pause", {
    method: "POST",
    body: JSON.stringify({ reason })
  });

  show(result);
  await loadRuntimeControls();
}

async function resumeRuntimeFromUi() {
  const result = await api("/api/admin/runtime/resume", {
    method: "POST"
  });

  show(result);
  await loadRuntimeControls();
}

async function saveRuntimeControls() {
  const controls = {
    allowPipelineRun: document.getElementById("allowPipelineRun").checked,
    allowJobRetry: document.getElementById("allowJobRetry").checked,
    allowProviderSwitch: document.getElementById("allowProviderSwitch").checked,
    allowChannelSwitch: document.getElementById("allowChannelSwitch").checked
  };

  const result = await api("/api/admin/runtime/controls", {
    method: "POST",
    body: JSON.stringify({ controls })
  });

  show(result);
  await loadRuntimeControls();
}


async function loadSettingsEditor() {
  const data = await api("/api/admin/settings");
  const settings = data.settings || {};

  document.getElementById("summary").innerHTML = `
    <div class="tile"><strong>Workflow</strong><br>${settings.workflow?.autoRetry ? "Auto Retry On" : "Auto Retry Off"}</div>
    <div class="tile"><strong>Scheduler</strong><br>${settings.scheduler?.enabled ? "Enabled" : "Disabled"}</div>
    <div class="tile"><strong>Renderer</strong><br>${settings.renderer?.defaultAspectRatio || "9:16"}</div>
    <div class="tile"><strong>Publishing</strong><br>${settings.publishing?.enabled ? "Enabled" : "Disabled"}</div>
  `;

  document.getElementById("output").innerHTML = `
    <div class="manager">
      <h2>Settings Editor</h2>

      <div class="settings-grid">
        <div class="settings-card">
          <h3>Workflow</h3>
          <label>Max Concurrent Jobs</label>
          <input id="workflowMaxConcurrentJobs" type="number" value="${settings.workflow?.maxConcurrentJobs ?? 3}">
          <label>Retry Limit</label>
          <input id="workflowRetryLimit" type="number" value="${settings.workflow?.retryLimit ?? 3}">
          <label>
            <input id="workflowAutoRetry" type="checkbox" ${settings.workflow?.autoRetry ? "checked" : ""}>
            Auto Retry
          </label>
        </div>

        <div class="settings-card">
          <h3>Scheduler</h3>
          <label>
            <input id="schedulerEnabled" type="checkbox" ${settings.scheduler?.enabled ? "checked" : ""}>
            Enabled
          </label>
          <label>Poll Interval Seconds</label>
          <input id="schedulerPollIntervalSeconds" type="number" value="${settings.scheduler?.pollIntervalSeconds ?? 30}">
        </div>

        <div class="settings-card">
          <h3>Renderer</h3>
          <label>Max Concurrent Renders</label>
          <input id="rendererMaxConcurrentRenders" type="number" value="${settings.renderer?.maxConcurrentRenders ?? 2}">
          <label>Default Aspect Ratio</label>
          <input id="rendererDefaultAspectRatio" value="${settings.renderer?.defaultAspectRatio || "9:16"}">
        </div>

        <div class="settings-card">
          <h3>Providers</h3>
          <label>
            <input id="providersFallbackEnabled" type="checkbox" ${settings.providers?.fallbackEnabled ? "checked" : ""}>
            Fallback Enabled
          </label>
        </div>

        <div class="settings-card">
          <h3>Publishing</h3>
          <label>
            <input id="publishingEnabled" type="checkbox" ${settings.publishing?.enabled ? "checked" : ""}>
            Enabled
          </label>
        </div>
      </div>

      <div class="settings-actions">
        <button onclick="saveSettingsFromUi()">Save Settings</button>
        <button onclick="resetSettingsFromUi()">Reset Defaults</button>
        <button onclick="reloadSettingsFromUi()">Reload</button>
        <p id="settingsStatus"></p>
      </div>
    </div>
  `;

  window.__settings = settings;
}

function collectSettingsFromUi() {
  return {
    workflow: {
      maxConcurrentJobs: Number(document.getElementById("workflowMaxConcurrentJobs").value || 3),
      autoRetry: document.getElementById("workflowAutoRetry").checked,
      retryLimit: Number(document.getElementById("workflowRetryLimit").value || 3)
    },
    scheduler: {
      enabled: document.getElementById("schedulerEnabled").checked,
      pollIntervalSeconds: Number(document.getElementById("schedulerPollIntervalSeconds").value || 30)
    },
    renderer: {
      maxConcurrentRenders: Number(document.getElementById("rendererMaxConcurrentRenders").value || 2),
      defaultAspectRatio: document.getElementById("rendererDefaultAspectRatio").value.trim() || "9:16"
    },
    providers: {
      fallbackEnabled: document.getElementById("providersFallbackEnabled").checked
    },
    publishing: {
      enabled: document.getElementById("publishingEnabled").checked
    }
  };
}

async function saveSettingsFromUi() {
  const settings = collectSettingsFromUi();

  const result = await api("/api/admin/settings/save", {
    method: "POST",
    body: JSON.stringify({ settings })
  });

  await loadSettingsEditor();
  const status = document.getElementById("settingsStatus");
  if (status) status.textContent = result.success ? "Settings saved successfully." : "Settings save failed.";
}

async function resetSettingsFromUi() {
  const ok = confirm("Reset settings to defaults?");
  if (!ok) return;

  const result = await api("/api/admin/settings/reset", {
    method: "POST"
  });

  await loadSettingsEditor();
  const status = document.getElementById("settingsStatus");
  if (status) status.textContent = result.success ? "Settings reset successfully." : "Settings reset failed.";
}


async function reloadSettingsFromUi() {
  await loadSettingsEditor();
  const status = document.getElementById("settingsStatus");
  if (status) status.textContent = "Settings reloaded.";
}


async function loadPublishingManager() {
  const data = await api("/api/admin/publishing");
  const schedulerData = await api("/api/admin/publishing/scheduler");
  const credentialsData = await api("/api/admin/publishing/credentials");
  const providerRuntimeData = await api("/api/admin/publishing/provider-runtime");
  const publishingHealthData = await api("/api/admin/publishing/health");

  const platforms = data.platforms || [];
  const queue = data.queue || [];
  const history = data.history || [];
  const scheduler = schedulerData.scheduler || {};
  const schedules = schedulerData.schedules || [];
  const runs = schedulerData.runs || [];
  const adapterHealth = data.adapterHealth || [];
  const providerStatuses = credentialsData.providerStatuses || [];
  const secretProviders = credentialsData.secrets?.providers || [];
  const providerRuntimePlatforms = providerRuntimeData.platforms || [];
  const publishingHealth = publishingHealthData.health || {};

  const readyProviders = providerStatuses.filter((item) => item.ready).length;
  const totalProviderStatuses = providerStatuses.length;
  const readinessScore = totalProviderStatuses
    ? Math.round((readyProviders / totalProviderStatuses) * 100)
    : 0;

  document.getElementById("summary").innerHTML = `
    <div class="tile"><strong>Platforms</strong><br>${platforms.length}</div>
    <div class="tile"><strong>Queue</strong><br>${queue.length}</div>
    <div class="tile"><strong>Schedules</strong><br>${scheduler.totalSchedules || schedules.length}</div>
    <div class="tile"><strong>Readiness</strong><br>${readinessScore}%</div>
  `;

  const platformRows = platforms.map((item) => `
    <div class="publishing-card">
      <h3>${item.platform.toUpperCase()}</h3>
      <p><b>Active:</b> ${item.active || "-"}</p>
      <p><b>Fallbacks:</b> ${(item.fallbacks || []).join(" → ") || "-"}</p>
      <p><b>Providers:</b> ${(item.providers || []).length}</p>
    </div>
  `).join("");

  const providerHealthRows = adapterHealth.map((health) => {
    const providerRows = (health.providers || []).map((provider) => `
      <div class="credential-row">
        <b>${provider.providerId}</b>
        <span>${provider.readyForRealPublishing ? "Ready" : "Not Ready"}</span>
        <small>
          Enabled: ${provider.enabled ? "yes" : "no"} |
          Credentials: ${provider.credentialsReady ? "ready" : "missing"} |
          Missing: ${(provider.missingCredentials || []).join(", ") || "-"}
        </small>
      </div>
    `).join("");

    return `
      <div class="publishing-card wide-card">
        <h3>${(health.platform || "unknown").toUpperCase()} Provider Health</h3>
        <p><b>Active:</b> ${health.active || "-"}</p>
        <p><b>Dry Run:</b> ${health.dryRunAvailable ? "Available" : "No"}</p>
        ${providerRows || "<p>No providers.</p>"}
      </div>
    `;
  }).join("") || "<p>No provider health data.</p>";

  const providerRuntimeRows = providerRuntimePlatforms.flatMap((platform) =>
    (platform.providers || []).map((provider) => `
      <div class="publishing-card">
        <h4>${provider.providerId}</h4>
        <p><b>Platform:</b> ${platform.platform}</p>
        <p><b>Enabled:</b> ${provider.enabled ? "Yes" : "No"}</p>
        <p><b>Real Publishing:</b> ${provider.realPublishing ? "ON" : "OFF"}</p>
        <p><b>Safe Mode:</b> ${provider.safeMode ? "ON" : "OFF"}</p>
        <p><b>Requires Auth:</b> ${provider.requiresAuth ? "Yes" : "No"}</p>
        <button onclick="enableRealPublishingFromUi('${platform.platform}', '${provider.providerId}')">Enable Real</button>
        <button onclick="disableRealPublishingFromUi('${platform.platform}', '${provider.providerId}')">Disable Real</button>
      </div>
    `)
  ).join("") || "<p>No provider runtime data.</p>";

  const credentialRows = providerStatuses.map((status) => `
    <div class="publishing-card">
      <h4>${status.providerId}</h4>
      <p><b>Platform:</b> ${status.platform || "-"}</p>
      <p><b>Active:</b> ${status.active ? "Yes" : "No"}</p>
      <p><b>Ready:</b> ${status.ready ? "Yes" : "No"}</p>
      <p><b>Required:</b> ${(status.required || []).join(", ") || "-"}</p>
      <p><b>Present:</b> ${(status.present || []).join(", ") || "-"}</p>
      <p><b>Missing:</b> ${(status.missing || []).join(", ") || "-"}</p>
      <p><b>Updated:</b> ${status.updatedAt || "-"}</p>
    </div>
  `).join("") || "<p>No credential statuses.</p>";

  const secretRows = secretProviders.map((provider) => `
    <div class="publishing-card">
      <h4>${provider.providerId}</h4>
      <p><b>Keys:</b> ${(provider.keys || []).join(", ") || "-"}</p>
      <p><b>Key Count:</b> ${provider.keyCount || 0}</p>
      <p><b>Updated:</b> ${provider.updatedAt || "-"}</p>
      <button onclick="deletePublishingSecretsFromUi('${provider.providerId}')">Delete Secrets</button>
    </div>
  `).join("") || "<p>No saved secrets yet.</p>";

  const queueRows = queue.map((job) => `
    <div class="publishing-card">
      <h4>${job.jobId}</h4>
      <p><b>Platform:</b> ${job.platform}</p>
      <p><b>Status:</b> ${job.status}</p>
      <p><b>Scheduled:</b> ${job.scheduledAt}</p>
      <p><b>Schedule:</b> ${job.payload?.scheduleId || "-"}</p>
    </div>
  `).join("") || "<p>No publishing jobs queued.</p>";

  const scheduleRows = schedules.map((schedule) => `
    <div class="publishing-card">
      <h4>${schedule.id}</h4>
      <p><b>Channel:</b> ${schedule.channelId || "-"}</p>
      <p><b>Platform:</b> ${schedule.platform || schedule.payload?.platform || "youtube"}</p>
      <p><b>Provider:</b> ${schedule.providerId || "-"}</p>
      <p><b>Publish At:</b> ${schedule.publishAt || "-"}</p>
      <p><b>Status:</b> ${schedule.status || "-"}</p>
      <p><b>Attempts:</b> ${schedule.attempts || 0}/${schedule.maxAttempts || 3}</p>
      <p><b>Queue Job:</b> ${schedule.queueJobId || "-"}</p>
      ${
        schedule.status === "scheduled"
          ? `<button onclick="cancelScheduleFromUi('${schedule.id}')">Cancel</button>`
          : ""
      }
    </div>
  `).join("") || "<p>No schedules created.</p>";

  const historyRows = history.slice(0, 5).map((job) => `
    <div class="publishing-card">
      <h4>${job.jobId}</h4>
      <p><b>Platform:</b> ${job.platform}</p>
      <p><b>Status:</b> ${job.status}</p>
      <p><b>Completed:</b> ${job.completedAt || "-"}</p>
    </div>
  `).join("") || "<p>No publishing history.</p>";

  const latestRun = scheduler.latestRun || runs[0] || null;

  document.getElementById("output").innerHTML = `
    <div class="manager">
      <h2>Publishing Manager</h2>

      <div class="publishing-grid">
        <div class="publishing-card">
          <h3>Scheduler Dashboard</h3>
          <p><b>Total:</b> ${scheduler.totalSchedules || 0}</p>
          <p><b>Scheduled:</b> ${scheduler.scheduled || 0}</p>
          <p><b>Queued:</b> ${scheduler.queued || 0}</p>
          <p><b>Failed:</b> ${scheduler.failed || 0}</p>
          <p><b>Due Now:</b> ${scheduler.dueNow || 0}</p>
          <button onclick="runPublishingSchedulerFromUi()">Run Scheduler</button>
        </div>

        <div class="publishing-card">
          <h3>Latest Scheduler Run</h3>
          <p><b>ID:</b> ${latestRun?.id || "-"}</p>
          <p><b>Due:</b> ${latestRun?.dueCount ?? "-"}</p>
          <p><b>Enqueued:</b> ${latestRun?.enqueuedCount ?? "-"}</p>
          <p><b>Failed:</b> ${latestRun?.failedCount ?? "-"}</p>
          <p><b>Finished:</b> ${latestRun?.finishedAt || "-"}</p>
        </div>

        <div class="publishing-card">
          <h3>Manual Publish</h3>
          <input id="publishChannelId" placeholder="Channel ID" value="test-channel">
          <input id="publishPlatform" placeholder="Platform e.g. youtube" value="youtube">
          <input id="publishContentType" placeholder="Content Type" value="video">
          <input id="publishTitle" placeholder="Title" value="Test publish title">
          <input id="publishFilePath" placeholder="File Path" value="storage/videos/test.mp4">
          <button onclick="enqueuePublishFromUi()">Enqueue</button>
          <button onclick="runNextPublishFromUi()">Run Next Dry Run</button>
        </div>

        <div class="publishing-card">
          <h3>Provider Readiness</h3>
          <p><b>Ready Providers:</b> ${readyProviders}/${totalProviderStatuses}</p>
          <p><b>Readiness Score:</b> ${readinessScore}%</p>
          <p><b>Saved Secret Providers:</b> ${secretProviders.length}</p>
          <button onclick="loadPublishingManager()">Reload Health</button>
        </div>

        <div class="publishing-card">
          <h3>Publishing Health</h3>
          <p><b>Score:</b> ${publishingHealth.score ?? "-"}</p>
          <p><b>Status:</b> ${publishingHealth.status || "-"}</p>
          <p><b>Generated:</b> ${publishingHealth.generatedAt || "-"}</p>
        </div>
      </div>

      <div class="form-card">
        <h3>Create Future Schedule</h3>
        <input id="scheduleChannelId" placeholder="Channel ID" value="unraaz">
        <input id="schedulePlatform" placeholder="Platform" value="youtube">
        <input id="scheduleProviderId" placeholder="Provider ID" value="dry_run">
        <input id="scheduleContentType" placeholder="Content Type" value="video">
        <input id="scheduleTitle" placeholder="Title" value="Scheduled video title">
        <input id="scheduleDescription" placeholder="Description" value="Scheduled video description">
        <input id="schedulePublishAt" type="datetime-local">
        <button onclick="createScheduleFromUi()">Create Schedule</button>
        <button onclick="loadPublishingManager()">Reload</button>
        <p id="publishingStatus"></p>
      </div>

      <div class="form-card">
        <h3>Save Provider Credentials</h3>
        <p>Paste credentials as JSON. Secrets are masked in dashboard.</p>
        <input id="credentialProviderId" placeholder="Provider ID e.g. telegram_bot_api" value="telegram_bot_api">
        <textarea id="credentialJson" placeholder='{"botToken":"...","chatId":"..."}'>{
  "botToken": "TEST_BOT_TOKEN",
  "chatId": "TEST_CHAT_ID"
}</textarea>
        <button onclick="savePublishingCredentialsFromUi()">Save Credentials</button>
        <button onclick="fillCredentialTemplate('youtube_api')">YouTube Template</button>
        <button onclick="fillCredentialTemplate('telegram_bot_api')">Telegram Template</button>
        <button onclick="fillCredentialTemplate('meta_graph_api')">Meta Template</button>
        <button onclick="fillCredentialTemplate('linkedin_api')">LinkedIn Template</button>
        <button onclick="fillCredentialTemplate('x_api')">X Template</button>
      </div>

      <h3>Provider Runtime Controls</h3>
      <div class="publishing-grid">${providerRuntimeRows}</div>

      <h3>Provider Health</h3>
      <div class="publishing-grid">${providerHealthRows}</div>

      <h3>Credential Status</h3>
      <div class="publishing-grid">${credentialRows}</div>

      <h3>Saved Secrets</h3>
      <div class="publishing-grid">${secretRows}</div>

      <h3>Schedules</h3>
      <div class="publishing-grid">${scheduleRows}</div>

      <h3>Platforms</h3>
      <div class="publishing-grid">${platformRows}</div>

      <h3>Queue</h3>
      <div class="publishing-grid">${queueRows}</div>

      <h3>Recent History</h3>
      <div class="publishing-grid">${historyRows}</div>
    </div>
  `;

  const publishAtInput = document.getElementById("schedulePublishAt");
  if (publishAtInput && !publishAtInput.value) {
    const date = new Date(Date.now() + 10 * 60 * 1000);
    date.setSeconds(0, 0);
    publishAtInput.value = date.toISOString().slice(0, 16);
  }
}

async function enqueuePublishFromUi() {
  const payload = {
    channelId: document.getElementById("publishChannelId").value.trim(),
    platform: document.getElementById("publishPlatform").value.trim(),
    contentType: document.getElementById("publishContentType").value.trim(),
    payload: {
      title: document.getElementById("publishTitle").value.trim(),
      filePath: document.getElementById("publishFilePath").value.trim()
    }
  };

  const result = await api("/api/admin/publishing/enqueue", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  await loadPublishingManager();
  const status = document.getElementById("publishingStatus");
  if (status) status.textContent = result.success ? "Publish job queued." : result.error || "Queue failed.";
}

async function runNextPublishFromUi() {
  const result = await api("/api/admin/publishing/run-next", {
    method: "POST"
  });

  await loadPublishingManager();
  const status = document.getElementById("publishingStatus");
  if (status) status.textContent = result.success ? "Dry run publish completed." : result.error || "Dry run failed.";
}


async function createScheduleFromUi() {
  const rawDate = document.getElementById("schedulePublishAt").value;

  const payload = {
    channelId: document.getElementById("scheduleChannelId").value.trim() || "unraaz",
    platform: document.getElementById("schedulePlatform").value.trim() || "youtube",
    providerId: document.getElementById("scheduleProviderId").value.trim() || "dry_run",
    contentType: document.getElementById("scheduleContentType").value.trim() || "video",
    title: document.getElementById("scheduleTitle").value.trim(),
    description: document.getElementById("scheduleDescription").value.trim(),
    publishAt: rawDate ? new Date(rawDate).toISOString() : new Date().toISOString()
  };

  const result = await api("/api/admin/publishing/schedules/create", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  await loadPublishingManager();
  const status = document.getElementById("publishingStatus");
  if (status) status.textContent = result.success ? "Schedule created." : result.error || "Schedule create failed.";
}

async function cancelScheduleFromUi(scheduleId) {
  const ok = confirm("Cancel this schedule?");
  if (!ok) return;

  const result = await api("/api/admin/publishing/schedules/cancel", {
    method: "POST",
    body: JSON.stringify({ scheduleId })
  });

  await loadPublishingManager();
  const status = document.getElementById("publishingStatus");
  if (status) status.textContent = result.success ? "Schedule cancelled." : result.error || "Cancel failed.";
}

async function runPublishingSchedulerFromUi() {
  const result = await api("/api/admin/publishing/scheduler/run", {
    method: "POST",
    body: JSON.stringify({ dryRun: true })
  });

  await loadPublishingManager();
  const status = document.getElementById("publishingStatus");
  if (status) status.textContent = result.success ? "Scheduler run completed." : result.error || "Scheduler failed.";
}


function fillCredentialTemplate(providerId) {
  const templates = {
    youtube_api: {
      clientId: "YOUR_YOUTUBE_CLIENT_ID",
      clientSecret: "YOUR_YOUTUBE_CLIENT_SECRET",
      refreshToken: "YOUR_YOUTUBE_REFRESH_TOKEN"
    },
    telegram_bot_api: {
      botToken: "YOUR_TELEGRAM_BOT_TOKEN",
      chatId: "YOUR_TELEGRAM_CHAT_ID"
    },
    meta_graph_api: {
      accessToken: "YOUR_META_ACCESS_TOKEN",
      pageId: "YOUR_PAGE_OR_ACCOUNT_ID"
    },
    linkedin_api: {
      accessToken: "YOUR_LINKEDIN_ACCESS_TOKEN",
      organizationId: "YOUR_ORGANIZATION_ID"
    },
    x_api: {
      apiKey: "YOUR_X_API_KEY",
      apiSecret: "YOUR_X_API_SECRET",
      accessToken: "YOUR_X_ACCESS_TOKEN",
      accessTokenSecret: "YOUR_X_ACCESS_TOKEN_SECRET"
    }
  };

  document.getElementById("credentialProviderId").value = providerId;
  document.getElementById("credentialJson").value =
    JSON.stringify(templates[providerId] || {}, null, 2);
}

async function savePublishingCredentialsFromUi() {
  const providerId = document.getElementById("credentialProviderId").value.trim();
  const rawJson = document.getElementById("credentialJson").value.trim();

  let secrets = {};

  try {
    secrets = JSON.parse(rawJson || "{}");
  } catch (error) {
    const status = document.getElementById("publishingStatus");
    if (status) status.textContent = "Invalid JSON: " + error.message;
    return;
  }

  const result = await api("/api/admin/publishing/credentials/save", {
    method: "POST",
    body: JSON.stringify({
      providerId,
      secrets
    })
  });

  await loadPublishingManager();

  const status = document.getElementById("publishingStatus");
  if (status) status.textContent = result.success ? "Credentials saved." : result.error || "Credential save failed.";
}

async function deletePublishingSecretsFromUi(providerId) {
  const ok = confirm("Delete saved secrets for " + providerId + "?");
  if (!ok) return;

  const result = await api("/api/admin/publishing/credentials/delete", {
    method: "POST",
    body: JSON.stringify({ providerId })
  });

  await loadPublishingManager();

  const status = document.getElementById("publishingStatus");
  if (status) status.textContent = result.success ? "Secrets deleted." : result.error || "Delete failed.";
}


async function enableRealPublishingFromUi(platform, providerId) {
  const ok = confirm(
    "Enable REAL publishing for " + providerId + " on " + platform + "?\\n\\nOnly do this after credentials are added and tested."
  );

  if (!ok) return;

  const result = await api("/api/admin/publishing/provider-runtime/enable-real", {
    method: "POST",
    body: JSON.stringify({
      platform,
      providerId
    })
  });

  await loadPublishingManager();

  const status = document.getElementById("publishingStatus");
  if (status) status.textContent = result.success ? "Real publishing enabled." : result.error || "Enable failed.";
}

async function disableRealPublishingFromUi(platform, providerId) {
  const result = await api("/api/admin/publishing/provider-runtime/disable-real", {
    method: "POST",
    body: JSON.stringify({
      platform,
      providerId
    })
  });

  await loadPublishingManager();

  const status = document.getElementById("publishingStatus");
  if (status) status.textContent = result.success ? "Real publishing disabled." : result.error || "Disable failed.";
}
