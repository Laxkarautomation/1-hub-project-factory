const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const USERS_FILE = path.join(__dirname, "..", "storage", "admin_users.json");
const sessions = new Map();

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function login(username, password) {
  const db = readJson(USERS_FILE, { users: [] });

  const user = db.users.find(
    (u) =>
      u.username === username &&
      u.password === password &&
      u.active !== false
  );

  if (!user) {
    return {
      success: false,
      error: "Invalid admin credentials"
    };
  }

  const token = crypto.randomBytes(32).toString("hex");

  sessions.set(token, {
    userId: user.id,
    username: user.username,
    role: user.role,
    createdAt: new Date().toISOString()
  });

  return {
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  };
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "").trim();

  if (!token || !sessions.has(token)) {
    res.writeHead(401, {
      "Content-Type": "application/json"
    });

    res.end(
      JSON.stringify({
        success: false,
        error: "Unauthorized"
      })
    );

    return;
  }

  req.adminSession = sessions.get(token);
  next();
}

module.exports = {
  login,
  requireAuth
};
