#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to ask a question and store the answer in the config object
function askQuestion(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function configure() {
  const enablePrisma = await askQuestion("Enable Prisma (yes): ");
  const enableServiceApi = await askQuestion("Enable Service API: (yes): ");
  const outputPath = await askQuestion("Output path: (./src/entities): ");
  const config = {
    type: type.length > 0 ? type : "commonjs",
    schemaPath: schemaPath.length > 0 ? schemaPath : "schemas",
    outputPath: outputPath.length > 0 ? outputPath : "src/entities",
  };
  const content = JSON.stringify(config, null, 2) + "\n";
  await fs.promises.writeFile(CONFIG_FILE_PATH, content);
  console.log(`[AIRENT/INFO] Configuration located at '${CONFIG_FILE_PATH}'`);
}

/** @typedef {Object} Config
 *  @property {"commonjs" | "module"} type
 *  @property {?string} airentPackage
 *  @property {string} schemaPath
 *  @property {string} outputPath
 *  @property {?string[]} [prologues]
 *  @property {?Template[]} [templates]
 */

const PROJECT_PATH = process.cwd();

const CONFIG_FILE_PATH = path.join(PROJECT_PATH, "airent.config.json");

async function loadConfig() {
  const configContent = await fs.promises.readFile(CONFIG_FILE_PATH, "utf8");
  return JSON.parse(configContent);
}

async function getShouldEnable(name, isEnabled) {
  if (isEnabled) {
    return false;
  }
  const shouldEnable = await askQuestion(`Enable ${name} (yes): `);
  return ["yes", "y"].includes(shouldEnable.toLowerCase());
}

async function main() {
  try {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      throw new Error("[AIREXT/ERROR] airent.config.json is not found");
    }
    const config = await loadConfig();
    const isPrismaEnabled = config.prologues?.includes(
      "node_modules/airext/templates/prisma.js"
    );
    const shouldEnablePrisma = await getShouldEnable("Prisma", isPrismaEnabled);
    const isServiceApiEnabled = config.prologues?.includes(
      "node_modules/airext/templates/api.js"
    );
    const shouldEnableServiceApi = await getShouldEnable(
      "Service Api",
      isServiceApiEnabled
    );
    if (!shouldEnablePrisma && !shouldEnableServiceApi) {
      return;
    }
    if (shouldEnablePrisma) {
      config.prologues = config.prologues ?? [];
      config.prologues.push("node_modules/airext/templates/prisma.js");
    }
    if (shouldEnableServiceApi) {
      config.prologues = config.prologues ?? [];
      config.prologues.push("node_modules/airext/templates/api.js");
      config.templates = config.templates ?? [];
      config.templates.push({
        name: "node_modules/airext/templates/service-template.ts.ejs",
        suffix: "service",
        skippable: false,
      });
      config.templates.push({
        name: "node_modules/airext/templates/api-template.ts.ejs",
        suffix: "api",
        skippable: false,
      });
    }
    const content = JSON.stringify(config, null, 2) + "\n";
    await fs.promises.writeFile(CONFIG_FILE_PATH, content);
    console.log(`[AIRENT/INFO] Configuration located at '${CONFIG_FILE_PATH}'`);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error);
});
