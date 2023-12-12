#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to ask a question and store the answer in the config object
function askQuestion(question, defaultAnswer) {
  return new Promise((resolve) =>
    rl.question(`${question} (${defaultAnswer}): `, resolve)
  ).then((a) => (a?.length ? a : defaultAnswer));
}

async function getShouldEnable(name, isEnabled) {
  if (isEnabled) {
    return false;
  }
  const shouldEnable = await askQuestion(`Enable "${name}"`, "yes");
  return shouldEnable === "yes";
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

const CONFIG_FILE_PATH = path.join(process.cwd(), "airent.config.json");

const AIREXT_RESOURCES_PATH = "node_modules/airext/resources";

const PRISMA_AUGMENTOR_PATH = `${AIREXT_RESOURCES_PATH}/prisma-augmentor.js`;

const API_AUGMENTOR_PATH = `${AIREXT_RESOURCES_PATH}/api-augmentor.js`;
const API_SERVER_ACTION_TEMPLATE_PATH = `${AIREXT_RESOURCES_PATH}/api-server-action-template.ts.ejs`;
const API_SERVER_SERVICE_TEMPLATE_PATH = `${AIREXT_RESOURCES_PATH}/api-server-service-template.ts.ejs`;
const API_CLIENT_RESTFUL_TEMPLATE_PATH = `${AIREXT_RESOURCES_PATH}/api-client-restful-template.ts.ejs`;

async function loadConfig() {
  const configContent = await fs.promises.readFile(CONFIG_FILE_PATH, "utf8");
  const config = JSON.parse(configContent);
  const augmentors = config.augmentors ?? [];
  const templates = config.templates ?? [];
  return { ...config, augmentors, templates };
}

async function configurePrisma(config) {
  const { augmentors } = config;
  const isPrismaAugmentorEnabled = augmentors.includes(PRISMA_AUGMENTOR_PATH);
  const shouldEnablePrismaAugmentor = await getShouldEnable(
    "Prisma",
    isPrismaAugmentorEnabled
  );
  if (shouldEnablePrismaAugmentor) {
    const defaultPrismaImport = "import prisma from '@/lib/prisma';";
    config.prismaImport = await askQuestion(
      'Statement to import "prisma"',
      config.prismaImport ?? defaultPrismaImport
    );
    augmentors.push(PRISMA_AUGMENTOR_PATH);
  } else if (!isPrismaAugmentorEnabled) {
    return;
  }

  const isPrismaYamlGeneratorEnabled = !!config.extensionSchemaPath?.length;
  const shouldEnablePrismaYamlGenerator = await getShouldEnable(
    "Prisma Dbml-based YAML Generator",
    isPrismaYamlGeneratorEnabled
  );
  if (shouldEnablePrismaYamlGenerator) {
    config.extensionSchemaPath = config.schemaPath;
    config.schemaPath = "node_modules/.airent/schemas";
    console.log(
      '[AIREXT/INFO] Please run "npx airext-prisma" before "npx airent" in the future.'
    );
  }
}

async function configureApi(config) {
  const { augmentors, templates } = config;
  const isApiEnabled = augmentors.includes(API_AUGMENTOR_PATH);
  const shouldEnableApi = await getShouldEnable("Api Suite", isApiEnabled);

  if (shouldEnableApi) {
    augmentors.push(API_AUGMENTOR_PATH);
    const isApiServerActionEnabled =
      templates.find((t) => t.name === API_SERVER_ACTION_TEMPLATE_PATH) !==
      undefined;
    if (!isApiServerActionEnabled) {
      templates.push({
        name: API_SERVER_ACTION_TEMPLATE_PATH,
        suffix: "action",
        skippable: false,
      });
    }
    const isApiServerServiceEnabled =
      templates.find((t) => t.name === API_SERVER_SERVICE_TEMPLATE_PATH) !==
      undefined;
    if (!isApiServerServiceEnabled) {
      templates.push({
        name: API_SERVER_SERVICE_TEMPLATE_PATH,
        suffix: "service",
        skippable: false,
      });
    }
  } else if (!isApiEnabled) {
    return;
  }

  const isApiClientRestfulEnabled =
    templates.find((t) => t.name === API_CLIENT_RESTFUL_TEMPLATE_PATH) !==
    undefined;
  const shouldEnableApiClientRestful = await getShouldEnable(
    "Restful Api Client",
    isApiClientRestfulEnabled
  );
  if (shouldEnableApiClientRestful) {
    const defaultAxiosImport = "import axios from 'axios';";
    config.axiosImport = await askQuestion(
      'Statement to import "axios"',
      config.axiosImport ?? defaultAxiosImport
    );
    const defaultApiBasePath = "/api/restful";
    config.apiBasePath = await askQuestion(
      "Enter Backend Api Base Path",
      config.apiBasePath ?? defaultApiBasePath
    );
    templates.push({
      name: API_CLIENT_RESTFUL_TEMPLATE_PATH,
      suffix: "restful",
      skippable: false,
    });
  }
}

async function main() {
  try {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      throw new Error('[AIREXT/ERROR] "airent.config.json" not found');
    }
    const config = await loadConfig();

    await configurePrisma(config);
    await configureApi(config);

    const content = JSON.stringify(config, null, 2) + "\n";
    await fs.promises.writeFile(CONFIG_FILE_PATH, content);
    console.log(`[AIREXT/INFO] Airext installed.`);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error);
});
