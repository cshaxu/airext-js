/* eslint-disable */

function getGlobalImports() {
  const globalImports = JSON.parse(JSON.stringify(config.globalImports)) ?? [
    "import prisma from 'TODO: specify globalImports in airent config';",
  ];
  globalImports.push("import { batchLoad } from 'airext';");
  return globalImports;
}

function isLoaderGeneratable(field) {
  if (field.prismaLoader === true) {
    return true;
  }
  if (field.prismaLoader === false) {
    return false;
  }
  return isEntityTypeField(field);
}

// internal
function buildModelsLoader(entityName) {
  const prismaName = toCamelCase(entityName);
  return `await batchLoad(prisma.${prismaName}.findMany, keys)`;
}

function getSelfLoadedModels() {
  return buildModelsLoader(getThisEntityStrings().entName);
}

function getTargetLoadedModels(field) {
  if (!isLoaderGeneratable(field)) {
    return "[/* TODO: load associated models */]";
  }
  return buildModelsLoader(toPrimitiveTypeName(field.type));
}
