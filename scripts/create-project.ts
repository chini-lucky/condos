import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, statSync, realpathSync } from "node:fs";
import { dirname, resolve, relative, isAbsolute, sep } from "node:path";
import { production } from "./production-target.ts";
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token)
  throw new Error(
    "Authenticate Supabase and provide SUPABASE_ACCESS_TOKEN to this trusted process only.",
  );
const fileArg = process.argv[2];
if (!fileArg)
  throw new Error(
    "Provide an owner-only database password file outside the repository.",
  );
const file = resolve(fileArg),
  repo = realpathSync(resolve(import.meta.dirname, ".."));
const physical = resolve(
  realpathSync(dirname(file)),
  file.split("/").at(-1) ?? "",
);
const distance = relative(repo, physical);
if (
  distance === "" ||
  (!isAbsolute(distance) &&
    distance !== ".." &&
    !distance.startsWith(`..${sep}`))
)
  throw new Error("Database password file must be outside the repository.");
let password: string;
try {
  const info = statSync(file);
  if (
    !info.isFile() ||
    (info.mode & 0o077) !== 0 ||
    realpathSync(file) !== physical
  )
    throw new Error(
      "Database password file must be a regular owner-only file.",
    );
  password = readFileSync(file, "utf8").trim();
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
    throw error;
  password = randomBytes(32).toString("base64url");
  writeFileSync(file, `${password}\n`, { flag: "wx", mode: 0o600 });
}
if (password.length < 24 || /\s/.test(password))
  throw new Error("Invalid database password file.");
function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null
    ? Object.getOwnPropertyDescriptor(value, key)?.value
    : undefined;
}
async function request(path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`https://api.supabase.com/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const message = field(result, "message");
    throw new Error(
      `Supabase HTTP ${response.status}: ${typeof message === "string" ? message.replaceAll(password, "[redacted]").replaceAll(token ?? "", "[redacted]") : "request failed"}`,
    );
  }
  return result;
}
const org = await request(`/organizations/${production.organizationId}`);
if (field(org, "plan") !== "free")
  throw new Error(
    "Expected the confirmed Free organization; stop for review rather than change billing.",
  );
const projects = await request("/projects");
if (!Array.isArray(projects)) throw new Error("Unexpected projects response");
const matches = projects.filter(
  (project: unknown) =>
    field(project, "organization_id") === production.organizationId &&
    field(project, "name") === production.projectName,
);
if (matches.length > 1)
  throw new Error("Multiple Condos projects found; do not create another.");
const project: unknown =
  matches[0] ??
  (await request("/projects", {
    name: production.projectName,
    organization_id: production.organizationId,
    region: production.region,
    db_pass: password,
  }));
if (
  field(project, "organization_id") !== production.organizationId ||
  field(project, "name") !== production.projectName ||
  field(project, "region") !== production.region
)
  throw new Error(
    "Provisioned project identity does not match the intended Condos target.",
  );
console.log(
  JSON.stringify({
    projectRef: field(project, "id"),
    name: field(project, "name"),
    region: field(project, "region"),
    status: field(project, "status"),
  }),
);
