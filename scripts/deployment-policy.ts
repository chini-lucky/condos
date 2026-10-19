export interface DeploymentContext {
  repository: string;
  event: string;
  ref: string;
  sha: string;
  bootstrapSha: string;
}
export function authorizeDeployment(context: DeploymentContext): void {
  if (context.repository !== "chini-lucky/condos")
    throw new Error("Deployment belongs to chini-lucky/condos only.");
  if (context.event !== "push" && context.event !== "workflow_dispatch")
    throw new Error("Only a trusted push or explicit dispatch may deploy.");
  if (context.ref === "refs/heads/main") return;
  if (
    context.event === "workflow_dispatch" &&
    context.ref === "refs/heads/integration/condos-v1" &&
    /^[a-f0-9]{40}$/.test(context.bootstrapSha) &&
    context.bootstrapSha === context.sha
  )
    return;
  throw new Error(
    "Deployment requires main or the explicitly pinned integration bootstrap commit.",
  );
}
