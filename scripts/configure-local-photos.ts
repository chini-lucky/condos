import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localConfig } from "./local-config.ts";
localConfig(); // Refuse anything except the isolated Condos stack.
const secret = randomBytes(32).toString("hex");
const file = join(tmpdir(), "condos-photo-functions.env");
writeFileSync(file, `PHOTO_CLEANUP_SECRET=${secret}\n`, { mode: 0o600 });
const values = [
  ["condos_photo_cleanup_secret", secret],
  [
    "condos_photo_cleanup_url",
    "http://supabase_kong_condos-local:8000/functions/v1/photo-cleanup",
  ],
];
const sql = values
  .map(
    ([name, value]) => `do $$ begin
  if exists(select 1 from vault.secrets where name = '${name}') then
    perform vault.update_secret((select id from vault.secrets where name = '${name}'), '${value}');
  else perform vault.create_secret('${value}', '${name}'); end if;
end $$;`,
  )
  .join("\n");
execFileSync(
  "docker",
  [
    "exec",
    "-i",
    "supabase_db_condos-local",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
  ],
  {
    input: `${sql}\nselect cron.alter_job((select jobid from cron.job where jobname = 'condos-photo-cleanup'), active := false);`,
    stdio: ["pipe", "pipe", "pipe"],
  },
);
console.log(
  `Local photo worker environment written to ${file}. Scheduler remains disabled until its explicit test.`,
);
