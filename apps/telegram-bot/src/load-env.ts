import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(here, "../../../.env");
const localEnv = path.resolve(here, "../.env");

config({ path: rootEnv });
config({ path: localEnv, override: false });
