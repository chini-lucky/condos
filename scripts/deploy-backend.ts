import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { production } from "./production-target.ts";
import { authorizeDeployment } from "./deployment-policy.ts";
authorizeDeployment({
  repository: process.env.GITHUB_REPOSITORY ?? "",
  event: process.env.GITHUB_EVENT_NAME ?? "",
  ref: process.env.GITHUB_REF ?? "",
  sha: process.env.GITHUB_SHA ?? "",
  bootstrapSha: process.env.CONDOS_BOOTSTRAP_SHA ?? "",
});
if (
  process.env.SUPABASE_PROJECT_REF !== production.projectRef ||
  !process.env.SUPABASE_ACCESS_TOKEN ||
  !process.env.SUPABASE_DB_PASSWORD
)
  throw new Error(
    "Production credentials are missing or target a different project.",
  );
let stage = "verify dedicated project";
try {
  const result: unknown = JSON.parse(
    execFileSync("supabase", ["projects", "list", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  if (!Array.isArray(result)) throw new Error("Invalid project response");
  const target: unknown = result.find(
    (item: unknown) =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      item.id === production.projectRef,
  );
  if (
    typeof target !== "object" ||
    target === null ||
    !("organization_id" in target) ||
    target.organization_id !== production.organizationId ||
    !("name" in target) ||
    target.name !== production.projectName ||
    !("region" in target) ||
    target.region !== production.region
  )
    throw new Error("Wrong project identity");
  const commands: [string, string[]][] = [
    ["link production", ["link", "--project-ref", production.projectRef]],
    ["apply versioned migrations", ["db", "push", "--linked", "--yes"]],
    [
      "apply production configuration",
      ["config", "push", "--project-ref", production.projectRef, "--yes"],
    ],
  ];
  if (existsSync("supabase/functions"))
    commands.push([
      "deploy functions",
      ["functions", "deploy", "--project-ref", production.projectRef],
    ]);
  for (const [label, args] of commands) {
    stage = label;
    execFileSync("supabase", args, { stdio: ["ignore", "pipe", "pipe"] });
    console.log(`Completed: ${label}.`);
  }
} catch {
  console.error(
    `Backend deployment failed: ${stage}. No frontend will be released. Inspect the migration/configuration in a trusted environment and rerun after correction.`,
  );
  process.exitCode = 1;
}
