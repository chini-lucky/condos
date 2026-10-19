import { localConfig } from "./local-config.ts";
const { url } = localConfig();
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    if (
      (await fetch(`${url}/functions/v1/photo-cleanup`, { method: "POST" }))
        .status === 403
    ) {
      ready = true;
      break;
    }
  } catch {
    /* Local function runtime is still booting. */
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (!ready) throw new Error("Local photo functions did not become ready.");
console.log("Local photo functions ready.");
