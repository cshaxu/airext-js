/* eslint-disable */

function getGlobalImports() {
  const globalImports = JSON.parse(JSON.stringify(config.globalImports)) ?? [
    "import prisma from 'TODO: specify globalImports in airent config';",
  ];
  globalImports.push("import { batchLoad } from 'airext';");
  return globalImports;
}

function isLoaderGeneratable(field) {
  return hasSourceKey(field) && hasTargetKey(field) && !field.skipPrismaLoader;
}

function getSelfLoadedModels() {
  const prismaName = toCamelCase(getThisEntityStrings().entName);
  return `await batchLoad(prisma.${prismaName}.findMany, keys)`;
}

function getTargetLoadedModels(field) {
  if (!isEntityTypeField(field) || !hasSourceKey(field)) {
    return "[/* TODO: load associated models here */]";
  } else if (!hasTargetKey(field)) {
    return "[/* TODO: load associated models with load keys */]";
  }
  const prismaName = toCamelCase(toPrimitiveTypeName(field.type));
  return `await batchLoad(prisma.${prismaName}.findMany, keys)`;
}
