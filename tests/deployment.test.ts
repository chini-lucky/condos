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
