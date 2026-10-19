import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeDeployment } from "../scripts/deployment-policy.ts";
test("production deploys only main or an explicitly pinned integration bootstrap", () => {
  const base = {
    repository: "chini-lucky/condos",
    event: "push",
    ref: "refs/heads/main",
    sha: "a".repeat(40),
    bootstrapSha: "",
  };
  assert.doesNotThrow(() => authorizeDeployment(base));
  assert.throws(() =>
    authorizeDeployment({ ...base, ref: "refs/heads/ticket/04-production" }),
  );
  assert.throws(() =>
    authorizeDeployment({ ...base, repository: "somebody/condos" }),
  );
  assert.throws(() => authorizeDeployment({ ...base, event: "pull_request" }));
  assert.throws(() =>
    authorizeDeployment({
      ...base,
      event: "workflow_dispatch",
      ref: "refs/heads/integration/condos-v1",
    }),
  );
  assert.throws(() =>
    authorizeDeployment({
      ...base,
      event: "push",
      ref: "refs/heads/integration/condos-v1",
      bootstrapSha: base.sha,
    }),
  );
  assert.throws(() =>
    authorizeDeployment({
      ...base,
      event: "workflow_dispatch",
      ref: "refs/heads/integration/condos-v1",
      bootstrapSha: "b".repeat(40),
    }),
  );
  assert.doesNotThrow(() =>
    authorizeDeployment({
      ...base,
      event: "workflow_dispatch",
      ref: "refs/heads/integration/condos-v1",
      bootstrapSha: base.sha,
    }),
  );
});

import { validatePublicConfig } from "../scripts/public-config.ts";
test("frontend configuration accepts the exact Condos URL and rejects privileged or wrong-project keys", () => {
  assert.doesNotThrow(() =>
    validatePublicConfig(
      "https://sthwmiesffowystewspf.supabase.co",
      "sb_publishable_example",
    ),
  );
  assert.doesNotThrow(() =>
    validatePublicConfig(
      "https://sthwmiesffowystewspf.supabase.co",
      "e30.eyJyb2xlIjoiYW5vbiJ9.signature",
    ),
  );
  assert.throws(() =>
    validatePublicConfig(
      "https://etyjwvoqdzejqeyuzeme.supabase.co",
      "sb_publishable_example",
    ),
  );
  assert.throws(() =>
    validatePublicConfig(
      "https://sthwmiesffowystewspf.supabase.co",
      "sb_secret_example",
    ),
  );
  assert.throws(() =>
    validatePublicConfig(
      "https://sthwmiesffowystewspf.supabase.co",
      "e30.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature",
    ),
  );
  assert.throws(() =>
    validatePublicConfig("https://sthwmiesffowystewspf.supabase.co", ""),
  );
});

import { validateLocalUrl } from "../scripts/local-config.ts";
test("disposable test tooling rejects hosted API targets", () => {
  assert.doesNotThrow(() => validateLocalUrl("http://127.0.0.1:56421"));
  assert.throws(() =>
    validateLocalUrl("https://sthwmiesffowystewspf.supabase.co"),
  );
  assert.throws(() => validateLocalUrl("http://127.0.0.1:55421"));
  assert.throws(() => validateLocalUrl("https://127.0.0.1.evil.example:56421"));
});
