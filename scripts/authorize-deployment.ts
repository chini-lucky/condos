import { authorizeDeployment } from "./deployment-policy.ts";
authorizeDeployment({
  repository: process.env.GITHUB_REPOSITORY ?? "",
  event: process.env.GITHUB_EVENT_NAME ?? "",
  ref: process.env.GITHUB_REF ?? "",
  sha: process.env.GITHUB_SHA ?? "",
  bootstrapSha: process.env.CONDOS_BOOTSTRAP_SHA ?? "",
});
console.log("Deployment source authorized.");
