/* eslint-disable */

function getGlobalImports() {
  return (
    config.globalImports ?? [
      "import prisma from 'TODO: specify globalImports in airent config';",
    ]
  );
}

function isLoaderGeneratable(field) {
  return hasSourceKey(field) && hasTargetKey(field) && !field.skipPrismaLoader;
}

function getTargetLoadedModels(field) {
  if (!hasSourceKey(field)) {
    return "[/* TODO: load associated models here */]";
  } else if (!hasTargetKey(field)) {
    return "[/* TODO: load associated models with the above keys */]";
  }

  const prismaName = toCamelCase(getOtherEntityStrings(field).entName);

  const sourceKeyArrays = getSourceFields(field).map((sf) => `${sf.name}s`);
  const targetKeyNames = field.targetFields;
  const conditions = targetKeyNames.map(
    (tkn, i) => `${tkn}: { in: ${sourceKeyArrays[i]} }`
  );
  const where = `where: { ${conditions.join(", ")} }`;
  return `await prisma.${prismaName}.findMany({ ${where} })`;
}
