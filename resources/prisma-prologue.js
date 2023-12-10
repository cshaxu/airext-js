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

function getAuxiliaryFields(entiti) /* Field[] */ {
  return entiti.fields.filter(isAuxiliaryField);
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
  const otherEntity = field._type?._entity;
  return otherEntity !== undefined && otherEntity.isPrisma !== false;
}

/********/
/* CODE */
/********/

/* line */

function buildModelsLoader(entityName) /* Code */ {
  const prismaModelName = utils.toCamelCase(entityName);
  return `await batchLoad(prisma.${prismaModelName}.findMany, keys)`;
}

function getSelfModelsLoader() /* Code */ {
  if (entity.isPrisma === false) {
    return "[/* Please add `skipSelfLoader: true` in yaml */]";
  }
  return buildModelsLoader(getSingularEntName());
}

function getTargetModelsLoader(field) /* Code */ {
  if (!isLoaderGeneratable(field)) {
    return "[/* TODO: load associated models */]";
  }
  return buildModelsLoader(field._type._entity.name);
}

/* block */

function getBaseBeforeLines() /* Code[] */ {
  const requiredImports = ["import { batchLoad } from 'airext';"];
  if (entity.isPrisma !== false) {
    requiredImports.push("import { Prisma } from '@prisma/client';");
  }
  const prismaImport =
    JSON.parse(JSON.stringify(config.prismaImport)) ??
    "import prisma from 'TODO: specify prismaImport in your airent config';";
  return [...requiredImports, prismaImport];
}

function getSelfLoaderLines() /* Code[] */ {
  const auxiliaryFields = getAuxiliaryFields(entity);
  const beforeLine = `if (keys.length === 0) { return []; }`;
  const afterLine = `return (this as any).fromArray(loadedModels);`;
  if (auxiliaryFields.length === 0) {
    const loadedModelsLine = `const loadedModels = ${getSelfModelsLoader()};`;
    return [beforeLine, loadedModelsLine, afterLine];
  }
  const { entityClass } = entity.strings;
  const auxiliaryFieldLines = auxiliaryFields.map((af) => [
    `const { ${af.name} } = keys[0];`,
    `if (${af.name} === undefined) {`,
    `  throw new Error('${entityClass}: ${af.name} is undefined');`,
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
  if (!utils.isEntityTypeField(field)) {
    return [
      mapperLine,
      `sources.forEach((one) => (one.${field.name} = ${setter}));`,
    ];
  }
  const { entityClass } = entity.strings;
  const auxiliaryFieldLines = getAuxiliaryFields(field._type._entity).map(
    (af) => [
      `  if (one.${af.name} === undefined) {`,
      `    throw new Error('${entityClass}.${field.name}: ${af.name} is undefined');`,
      `  } else {`,
      utils.isArrayField(field)
        ? `    one.${field.name}.forEach((e) => (e.${af.name} = one.${af.name}));`
        : utils.isNullableField(field)
        ? `    if (one.${field.name} !== null) { one.${field.name}.${af.name} = one.${af.name}; }`
        : `    one.${field.name}.${af.name} = one.${af.name};`,
      `  }`,
    ]
  );
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
  const { name: entityName, strings } = entity;
  const entName = utils.toTitleCase(entityName);
  const prismaArgName = `Prisma.${entName}${utils.toTitleCase(
    prismaMethod
  )}Args`;
  const auxiliaryFieldLines = getAuxiliaryFields(entity).map(
    (af) => `  ${af.name}: ${af.type},`
  );
  return [
    "",
    `public static async ${prismaMethod}<`,
    `  ENTITY extends ${strings.baseClass},`,
    `  T extends ${prismaArgName},`,
    ">(",
    `  this: EntityConstructor<${entity.model}, ENTITY>,`,
    `  args: Prisma.SelectSubset<T, ${prismaArgName}>,`,
    ...auxiliaryFieldLines,
    `): Promise<ENTITY${typeSuffix}> {`,
  ];
}

function buildPrismaManyMethodLines(prismaMethod) /* Code[] */ {
  const prismaModelName = utils.toCamelCase(entity.name);
  const auxiliaryFields = getAuxiliaryFields(entity);
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
  const prismaModelName = utils.toCamelCase(entity.name);
  const auxiliaryFields = getAuxiliaryFields(entity);

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
  const prismaModelName = utils.toCamelCase(entity.name);
  return [
    "",
    `public static ${prismaMethod} = prisma.${prismaModelName}.${prismaMethod};`,
  ];
}

function getBaseInsideLines() /* Code[] */ {
  if (entity.isPrisma === false) {
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
