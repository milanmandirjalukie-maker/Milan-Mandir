const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
const host = "0.0.0.0";
const rootDir = __dirname;
const liveEntry = path.join(rootDir, "supabase-index.html");
const offlineEntry = path.join(rootDir, "index.html");

app.use(
  express.static(rootDir, {
    index: false,
  }),
);

app.get("/", (_request, response) => {
  response.sendFile(liveEntry);
});

app.get("/offline", (_request, response) => {
  response.sendFile(offlineEntry);
});

app.get("*", (request, response, next) => {
  const requestedPath = path.join(rootDir, request.path);

  if (path.extname(requestedPath)) {
    return next();
  }

  return response.sendFile(liveEntry);
});

app.listen(port, host, () => {
  console.log(`MILAN MANDIR live app listening on ${host}:${port}`);
});
