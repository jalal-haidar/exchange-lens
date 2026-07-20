import { cpSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = process.argv[2];

if (!env || !["development", "production"].includes(env)) {
  console.error("Usage: node scripts/switch-env.js <development|production>");
  process.exit(1);
}

const source = resolve(__dirname, `.env.${env}`);
const target = resolve(__dirname, ".env.local");

if (!existsSync(source)) {
  console.error(`Environment file not found: ${source}`);
  process.exit(1);
}

cpSync(source, target, { force: true });
console.log(`✅ Switched to ${env} environment (.env.local)`);
