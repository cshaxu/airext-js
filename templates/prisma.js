/* eslint-disable */

function getGlobalImports() {
  const globalImports = config.globalImports ?? [
    "import prisma from 'TODO: specify globalImports in airent config';",
  ];
  globalImports.push("import { batchLoad } from 'airext';");
  return globalImports;
}

function isLoaderGeneratable(field) {
  return hasSourceKey(field) && hasTargetKey(field) && !field.skipPrismaLoader;
}

function getTargetLoadedModels(field) {
  if (!isEntityTypeField(field) || !hasSourceKey(field)) {
    return "[/* TODO: load associated models here */]";
  } else if (!hasTargetKey(field)) {
    return "[/* TODO: load associated models with the above keys */]";
  }

  const prismaName = toCamelCase(toPrimitiveTypeName(field.type));

  const sourceKeyArrays = getSourceFields(field).map((sf) => `${sf.name}s`);
  const targetKeyNames = field.targetFields;
  const conditions = targetKeyNames.map(
    (tkn, i) => `${tkn}: { in: ${sourceKeyArrays[i]} }`
  );
  const where = `where: { ${conditions.join(", ")} }`;
  return `await batchLoad(prisma.${prismaName}.findMany, { ${where} })`;
}
