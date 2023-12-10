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
 *  @property {?string} extensionSchemaPath
 *  @property {?string} [prismaImport]
 *  @property {?string[]} [augmentors]
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

const AIREXT_RESOURCES_PATH = "node_modules/airext/resources";
const PRISMA_PROLOGUE_PATH = `${AIREXT_RESOURCES_PATH}/prisma-prologue.js`;
const API_PROLOGUE_PATH = `${AIREXT_RESOURCES_PATH}/api-prologue.js`;
const SERVICE_TEMPLATE_PATH = `${AIREXT_RESOURCES_PATH}/service-template.ts.ejs`;
const API_TEMPLATE_PATH = `${AIREXT_RESOURCES_PATH}/api-template.ts.ejs`;
const AXIOS_TEMPLATE_PATH = `${AIREXT_RESOURCES_PATH}/axios-template.ts.ejs`;

async function main() {
  try {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      throw new Error("[AIREXT/ERROR] airent.config.json is not found");
    }
    const config = await loadConfig();

    const isPrismaEnabled = config.prologues?.includes(PRISMA_PROLOGUE_PATH);
    const shouldEnablePrisma = await getShouldEnable("Prisma", isPrismaEnabled);
    const prismaImport =
      shouldEnablePrisma && !config.prismaImport?.length
        ? await askQuestion(
            "Statement to import 'prisma' (e.g. \"import prisma from '@/lib/prisma';\"): "
          )
        : "";

    const isApiServiceEnabled = config.prologues?.includes(API_PROLOGUE_PATH);
    const shouldEnableApiService = await getShouldEnable(
      "Backend Api Service",
      isApiServiceEnabled
    );

    const existingTemplates = (config.templates ?? []).map((t) => t.name);
    const isApiClientEnabled = existingTemplates.includes(AXIOS_TEMPLATE_PATH);
    const shouldEnableApiClient = await getShouldEnable(
      "Axios Api Client",
      isApiClientEnabled
    );
    const axiosImport =
      shouldEnablePrisma && !config.axiosImport?.length
        ? await askQuestion(
            "Statement to import 'axios' (e.g. \"import axios from 'axios';\"): "
          )
        : "";
    const apiBasePath = shouldEnableApiClient
      ? await askQuestion('Base path for backend api (e.g. "/api/restful"): ')
      : "";

    if (
      !shouldEnablePrisma &&
      !shouldEnableApiService &&
      !shouldEnableApiClient
    ) {
      return;
    }

    if (shouldEnablePrisma) {
      if (prismaImport.length) {
        config.prismaImport = prismaImport;
      }
      config.extensionSchemaPath = config.schemaPath;
      config.schemaPath = "node_modules/.airent/schemas";
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
      if (axiosImport.length) {
        config.axiosImport = axiosImport;
      }
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
      const isApiBasePathAdded = !!config.apiBasePath?.length;
      if (!isApiBasePathAdded) {
        config.apiBasePath = apiBasePath;
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
