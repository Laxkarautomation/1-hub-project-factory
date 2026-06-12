const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SECRET_FILE = path.join(ROOT, "storage/publishing/publishing_secrets.json");

function ensureFile() {
  fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });

  if (!fs.existsSync(SECRET_FILE)) {
    fs.writeFileSync(SECRET_FILE, JSON.stringify({
      version: 1,
      providers: {}
    }, null, 2));
  }
}

function readSecrets() {
  ensureFile();

  try {
    const data = JSON.parse(fs.readFileSync(SECRET_FILE, "utf8"));

    return {
      version: data.version || 1,
      providers: data.providers || {}
    };
  } catch {
    return {
      version: 1,
      providers: {}
    };
  }
}

function writeSecrets(data) {
  ensureFile();
  fs.writeFileSync(SECRET_FILE, JSON.stringify(data, null, 2));
  return readSecrets();
}

function maskValue(value) {
  if (!value) return null;

  const text = String(value);

  if (text.length <= 6) {
    return "***";
  }

  return `${text.slice(0, 3)}***${text.slice(-3)}`;
}

function maskSecrets(secrets = {}) {
  return Object.fromEntries(
    Object.entries(secrets).map(([key, value]) => [
      key,
      maskValue(value)
    ])
  );
}

function getProviderSecrets(providerId) {
  const data = readSecrets();
  return data.providers[providerId] || {};
}

function getMaskedProviderSecrets(providerId) {
  return maskSecrets(getProviderSecrets(providerId));
}

function saveProviderSecrets(providerId, secrets = {}) {
  if (!providerId) {
    throw new Error("providerId is required");
  }

  const data = readSecrets();

  data.providers[providerId] = {
    ...(data.providers[providerId] || {}),
    ...secrets,
    updatedAt: new Date().toISOString()
  };

  return writeSecrets(data).providers[providerId];
}

function deleteProviderSecrets(providerId) {
  if (!providerId) {
    throw new Error("providerId is required");
  }

  const data = readSecrets();

  delete data.providers[providerId];

  writeSecrets(data);

  return {
    success: true,
    providerId
  };
}

function getSecretDashboard() {
  const data = readSecrets();

  const providers = Object.entries(data.providers || {}).map(([providerId, secrets]) => {
    const keys = Object.keys(secrets).filter((key) => key !== "updatedAt");

    return {
      providerId,
      keyCount: keys.length,
      keys,
      masked: maskSecrets(secrets),
      updatedAt: secrets.updatedAt || null
    };
  });

  return {
    success: true,
    totalProviders: providers.length,
    providers
  };
}

module.exports = {
  SECRET_FILE,
  readSecrets,
  getProviderSecrets,
  getMaskedProviderSecrets,
  saveProviderSecrets,
  deleteProviderSecrets,
  getSecretDashboard,
  maskSecrets
};
