import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { app } from "./index.js";

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = "http://127.0.0.1:" + server.address().port;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("service root advertises the API documentation and core routes", async () => {
  const response = await fetch(baseUrl + "/");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.name, "Rivals Intel API");
  assert.equal(body.documentation, "/openapi.json");
  assert.ok(body.endpoints.playerProfile);
});

test("health endpoint reports service and provider without exposing secrets", async () => {
  const response = await fetch(baseUrl + "/health");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, "rivals-intel-api");
  assert.ok(body.timestamp);
  assert.equal(Object.hasOwn(body, "databaseUrl"), false);
});

test("OpenAPI document is valid JSON with the expected routes", async () => {
  const response = await fetch(baseUrl + "/openapi.json");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.openapi, "3.1.0");
  assert.ok(body.paths["/api/player/{username}"]);
  assert.ok(body.paths["/api/player/{username}/match-history"]);
});

test("player lookup rejects invalid usernames before contacting the provider", async () => {
  const response = await fetch(baseUrl + "/api/player/a");
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /valid player username/i);
});

test("match-history rejects invalid pagination before contacting the provider", async () => {
  for (const query of ["page=0", "limit=51", "page=1.5", "limit=abc"]) {
    const response = await fetch(baseUrl + "/api/player/ValidPlayer/match-history?" + query);
    assert.equal(response.status, 400, query);
  }
});

test("public registration stays disabled by default", async () => {
  const response = await fetch(baseUrl + "/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "test@example.com", username: "testuser", password: "a-very-long-test-password" })
  });
  assert.equal(response.status, 403);
});

test("unapproved browser origins receive a clear forbidden response", async () => {
  const response = await fetch(baseUrl + "/health", { headers: { origin: "https://unapproved.example" } });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "This origin is not allowed." });
});
