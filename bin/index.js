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

/** @typedef {Object} Config
 *  @property {"commonjs" | "module"} type
 *  @property {?string} airentPackage
 *  @property {string} schemaPath
 *  @property {string} outputPath
 *  @property {?string[]} [globalImports]
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
  return ["yes", "y", ""].includes(shouldEnable.toLowerCase());
}

const PRISMA_PROLOGUE_PATH = "node_modules/airext/templates/prisma.js";
const API_PROLOGUE_PATH = "node_modules/airext/templates/api.js";
const SERVICE_TEMPLATE_PATH =
  "node_modules/airext/templates/service-template.ts.ejs";
const API_TEMPLATE_PATH = "node_modules/airext/templates/api-template.ts.ejs";
const AXIOS_TEMPLATE_PATH =
  "node_modules/airext/templates/axios-template.ts.ejs";

async function main() {
  try {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      throw new Error("[AIREXT/ERROR] airent.config.json is not found");
    }
    const config = await loadConfig();

    const isPrismaEnabled = config.prologues?.includes(PRISMA_PROLOGUE_PATH);
    const shouldEnablePrisma = await getShouldEnable("Prisma", isPrismaEnabled);
    const prismaGlobalImport = shouldEnablePrisma
      ? await askQuestion(
          "Statement to import 'prisma' (e.g. \"import prisma from '@/lib/prisma';\" or leave empty): "
        )
      : "";

    const isApiServiceEnabled = config.prologues?.includes(API_PROLOGUE_PATH);
    const shouldEnableApiService = await getShouldEnable(
      "Backend Api Service",
      isApiServiceEnabled
    );

    const isApiClientEnabled = config.templates?.includes(AXIOS_TEMPLATE_PATH);
    const shouldEnableApiClient = await getShouldEnable(
      "Axios Api Client",
      isApiClientEnabled
    );

    if (
      !shouldEnablePrisma &&
      !shouldEnableApiService &&
      !shouldEnableApiClient
    ) {
      return;
    }

    if (shouldEnablePrisma) {
      if (prismaGlobalImport.length) {
        config.globalImports = config.globalImports ?? [];
        config.globalImports.push(prismaGlobalImport);
      }
      config.prologues = config.prologues ?? [];
      config.prologues.push(PRISMA_PROLOGUE_PATH);
    }

    if (shouldEnableApiService) {
      config.prologues = config.prologues ?? [];
      config.prologues.push(API_PROLOGUE_PATH);

      config.templates = config.templates ?? [];

      const isApiServiceTepmlateAdded = config.templates.find(
        (t) => t.name === SERVICE_TEMPLATE_PATH
      );
      if (!isApiServiceTepmlateAdded) {
        config.templates.push({
          name: SERVICE_TEMPLATE_PATH,
          suffix: "service",
          skippable: false,
        });
      }

      const isApiTepmlateAdded = config.templates.find(
        (t) => t.name === API_TEMPLATE_PATH
      );
      if (!isApiTepmlateAdded) {
        config.templates.push({
          name: API_TEMPLATE_PATH,
          suffix: "api",
          skippable: false,
        });
      }
    }

    if (shouldEnableApiClient) {
      config.templates = config.templates ?? [];
      const isApiClientTepmlateAdded = config.templates.find(
        (t) => t.name === AXIOS_TEMPLATE_PATH
      );
      if (!isApiClientTepmlateAdded) {
        config.templates.push({
          name: AXIOS_TEMPLATE_PATH,
          suffix: "axios",
          skippable: false,
        });
      }
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
