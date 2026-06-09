async function run(payload = {}) {
  return {
    success: false,
    provider: "remotion",
    status: "not_implemented",
    error: "Remotion runtime connector ready but renderer integration not connected yet",
    payload
  };
}

module.exports = {
  name: "remotion",
  run
};
