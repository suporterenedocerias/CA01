#!/usr/bin/env node
/**
 * Build do site + env.js em dist/ (se existir .env na raiz).
 * Uso: npm run deploy
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

console.log(">> npm run build\n");
execSync("npm run build", { stdio: "inherit" });

const envPath = path.join(root, ".env");
const outJs = path.join(root, "dist", "env.js");
if (fs.existsSync(envPath)) {
  console.log("\n>> env.js → dist/\n");
  execSync(`node deploy/write-env-js.mjs "${envPath}" "${outJs}"`, {
    stdio: "inherit",
    shell: true,
  });
} else {
  console.warn(
    "\n[AVISO] Sem .env na raiz — dist/env.js não gerado. Em produção rode:\n" +
      "  node deploy/write-env-js.mjs /caminho/.env /www/wwwroot/SEU_SITE/env.js\n",
  );
}

console.log("\n>> Pronto. Envie a pasta dist/ (e env.js) para o servidor ou faça git push + deploy na VPS.\n");
