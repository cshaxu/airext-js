/* eslint-disable */

/**
 * CONFIG FIELDS
 * prismaImport: string | undefined, import statement for prisma client
 *
 * YAML FLAGS
 * - isPrisma: false | undefined, top-level flag, false to skip generating prisma wrappers
 * - prismaLoader: boolean | undefined, field-level flag to decide whether to generate loader for the field
 */

/**********/
/* QUERY  */
/**********/

function getAuxiliaryFields() /* Field[] */ {
  return schema.fields.filter(isAuxiliaryField);
}

function getOtherEntityAuxiliaryFields(entityName) /* Field[] */ {
  return schemaMap[entityName]?.fields?.filter(isAuxiliaryField);
}

/***********/
/* BOOLEAN */
/***********/

function isAuxiliaryField(field) /* boolean */ {
  return field.type.endsWith(" | undefined");
}

function isLoaderGeneratable(field) /* boolean */ {
  if (field.prismaLoader === true) {
    return true;
  }
  if (field.prismaLoader === false) {
    return false;
  }
  const otherEntitySchema = schemaMap[toPrimitiveTypeName(field.type)];
  if (!otherEntitySchema || otherEntitySchema.isPrisma === false) {
    return false;
  }
  return isEntityTypeField(field);
}

/********/
/* CODE */
/********/

/* line */

function buildModelsLoader(entityName) /* Code */ {
  const prismaName = toCamelCase(entityName);
  return `await batchLoad(prisma.${prismaName}.findMany, keys)`;
}

function getSelfModelsLoader() /* Code */ {
  return buildModelsLoader(toTitleCase(schema.entityName));
}

function getTargetModelsLoader(field) /* Code */ {
  if (!isLoaderGeneratable(field)) {
    return "[/* TODO: load associated models */]";
  }
  return buildModelsLoader(toPrimitiveTypeName(field.type));
}

/* block */

function getBaseExtraImports() /* Code[] */ {
  const requiredImports = [
    "import { batchLoad } from 'airext';",
    "import { Prisma } from '@prisma/client';",
  ];
  const prismaImport =
    JSON.parse(JSON.stringify(config.prismaImport)) ??
    "import prisma from 'TODO: specify prismaImport in your airent config';";
  return [...requiredImports, prismaImport];
}

function getSelfLoaderLines() /* Code[] */ {
  const auxiliaryFields = getAuxiliaryFields();
  const beforeLine = `if (keys.length === 0) { return []; }`;
  const afterLine = `return (this as any).fromArray(loadedModels);`;
  if (auxiliaryFields.length === 0) {
    const loadedModelsLine = `const loadedModels = ${getSelfModelsLoader()};`;
    return [beforeLine, loadedModelsLine, afterLine];
  }
  const { entityClass } = schema.strings;
  const auxiliaryFieldLines = auxiliaryFields.map((af) => [
    `const { ${af.name} } = keys[0];`,
    `if (${af.name} === undefined) {`,
    `  throw new Error('${entityClass}.${af.name} is undefined');`,
    `}`,
  ]);
  const auxiliaryFieldNameList = auxiliaryFields
    .map((af) => af.name)
    .join(", ");
  const keysOmitterLines = [
    `keys = keys.map(({ ${auxiliaryFieldNameList}, ...rest }) => rest);`,
  ];
  const prismaModelsLine = `const prismaModels = ${getSelfModelsLoader()};`;
  const loadedModelsLine = `const loadedModels = prismaModels.map((pm) => ({ ...pm, ${auxiliaryFieldNameList} }));`;
  return [
    beforeLine,
    ...auxiliaryFieldLines.flat(),
    ...keysOmitterLines.flat(),
    prismaModelsLine,
    loadedModelsLine,
    afterLine,
  ];
}

function getLoadConfigSetterLines(field) /* Code[] */ {
  const mapper = getLoadConfigTargetMapper(field);
  const setter = getLoadConfigSourceSetter(field);
  const mapperLine = `const map = ${mapper};`;
  if (!isEntityTypeField(field)) {
    return [
      mapperLine,
      `sources.forEach((one) => (one.${field.name} = ${setter}));`,
    ];
  }
  const { entityClass } = schema.strings;
  const otherEntityName = toTitleCase(toPrimitiveTypeName(field.type));
  const auxiliaryFieldLines = getOtherEntityAuxiliaryFields(
    otherEntityName
  ).map((af) => [
    `  if (one.${af.name} === undefined) {`,
    `    throw new Error('${entityClass}.${af.name} is undefined');`,
    `  } else {`,
    isArrayField(field)
      ? `    one.${field.name}.forEach((e) => (e.${af.name} = one.${af.name}));`
      : isNullableField(field)
      ? `    if (one.${field.name} !== null) { one.${field.name}.${af.name} = one.${af.name}; }`
      : `    one.${field.name}.${af.name} = one.${af.name};`,
    `  }`,
  ]);
  return [
    mapperLine,
    `sources.forEach((one) => {`,
    `  one.${field.name} = ${setter};`,
    ...auxiliaryFieldLines.flat(),
    `});`,
  ];
}

function buildPrismaMethodSignatureLines(
  prismaMethod,
  typeSuffix
) /* Code[] */ {
  const { baseClass } = schema.strings;
  const prismaArgName = `Prisma.${toTitleCase(schema.entityName)}${toTitleCase(
    prismaMethod
  )}Args`;
  const auxiliaryFieldLines = getAuxiliaryFields().map(
    (af) => `  ${af.name}: ${af.type},`
  );
  return [
    "",
    `public static async ${prismaMethod}<`,
    `  ENTITY extends ${baseClass},`,
    `  T extends ${prismaArgName},`,
    ">(",
    `  this: EntityConstructor<${schema.modelName}, ENTITY>,`,
    `  args: Prisma.SelectSubset<T, ${prismaArgName}>,`,
    ...auxiliaryFieldLines,
    `): Promise<ENTITY${typeSuffix}> {`,
  ];
}

function buildPrismaManyMethodLines(prismaMethod) /* Code[] */ {
  const prismaModelName = toCamelCase(schema.entityName);
  const auxiliaryFields = getAuxiliaryFields();
  const beforeLines = buildPrismaMethodSignatureLines(prismaMethod, "[]");
  const afterLines = ["  return (this as any).fromArray(models);", "}"];

  const variableName = auxiliaryFields.length === 0 ? "models" : "prismaModels";
  const prismaLoaderLine = `  const ${variableName} = await prisma.${prismaModelName}.${prismaMethod}(args)`;

  if (auxiliaryFields.length === 0) {
    return [...beforeLines, prismaLoaderLine, ...afterLines];
  }

  const auxiliaryFieldNameList = auxiliaryFields
    .map((af) => af.name)
    .join(", ");
  return [
    ...beforeLines,
    prismaLoaderLine,
    `  const models = ${variableName}.map((pm) => ({ ...pm, ${auxiliaryFieldNameList} }));`,
    ...afterLines,
  ];
}

function buildPrismaOneMethodLines(prismaMethod, isNullable) /* Code[] */ {
  const prismaModelName = toCamelCase(schema.entityName);
  const auxiliaryFields = getAuxiliaryFields();

  const beforeLines = buildPrismaMethodSignatureLines(
    prismaMethod,
    isNullable ? " | null" : ""
  );
  const afterLines = ["  return (this as any).fromOne(model);", "}"];

  const variableName = auxiliaryFields.length === 0 ? "model" : "prismaModel";
  const prismaLoaderLines = [
    `  const ${variableName} = await prisma.${prismaModelName}.${prismaMethod}(args);`,
    ...(isNullable
      ? [`  if (${variableName} === null) {`, "    return null;", "  }"]
      : []),
  ];

  if (auxiliaryFields.length === 0) {
    return [...beforeLines, ...prismaLoaderLines, ...afterLines];
  }

  const auxiliaryFieldNameList = auxiliaryFields
    .map((af) => af.name)
    .join(", ");
  return [
    ...beforeLines,
    ...prismaLoaderLines,
    `  const model = { ...${variableName}, ${auxiliaryFieldNameList} };`,
    ...afterLines,
  ];
}

function buildPrismaNullableOneMethodLines(prismaMethod) /* Code[] */ {
  return buildPrismaOneMethodLines(prismaMethod, true);
}

function buildPrismaNonNullableOneMethodLines(prismaMethod) /* Code[] */ {
  return buildPrismaOneMethodLines(prismaMethod, false);
}

function buildPrismaPassThruMethodLines(prismaMethod) /* Code[] */ {
  const prismaModelName = toCamelCase(schema.entityName);
  return [
    "",
    `public static ${prismaMethod} = prisma.${prismaModelName}.${prismaMethod};`,
  ];
}

function getBaseExtraLines() /* Code[] */ {
  if (schema.isPrisma === false) {
    return [];
  }
  const nullableOneMethods = ["findUnique", "findFirst"];
  const nonNullableOneMethods = [
    "findUniqueOrThrow",
    "findFirstOrThrow",
    "upsert",
    "create",
    "update",
    "delete",
  ];
  const passThruMethods = [
    "createMany",
    "updateMany",
    "deleteMany",
    "count",
    "aggregate",
    "groupBy",
  ];
  return [
    "",
    "/** prisma wrappers */",
    ...buildPrismaManyMethodLines("findMany"),
    ...nullableOneMethods.flatMap(buildPrismaNullableOneMethodLines),
    ...nonNullableOneMethods.flatMap(buildPrismaNonNullableOneMethodLines),
    ...passThruMethods.flatMap(buildPrismaPassThruMethodLines),
  ];
}
