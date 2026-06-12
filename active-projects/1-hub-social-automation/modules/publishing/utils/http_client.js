const https = require("https");
const http = require("http");

function requestJson(url, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;

    const payload = options.body
      ? Buffer.from(
          typeof options.body === "string"
            ? options.body
            : JSON.stringify(options.body)
        )
      : null;

    const req = lib.request(
      parsed,
      {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": payload.length } : {}),
          ...(options.headers || {})
        },
        timeout: options.timeout || 30000
      },
      (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          let json = null;

          try {
            json = data ? JSON.parse(data) : null;
          } catch {
            json = null;
          }

          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            headers: res.headers,
            body: json || data
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve({
        success: false,
        error: "HTTP request timeout"
      });
    });

    req.on("error", (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

module.exports = {
  requestJson
};
