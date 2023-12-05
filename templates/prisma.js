/* eslint-disable */

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

function getSelfLoadedModels() /* Code */ {
  return buildModelsLoader(getThisEntityStrings().entName);
}

function getTargetLoadedModels(field) /* Code */ {
  if (!isLoaderGeneratable(field)) {
    return "[/* TODO: load associated models */]";
  }
  return buildModelsLoader(toPrimitiveTypeName(field.type));
}

/* block */

function getGlobalImports() /* Code[] */ {
  const globalImports = JSON.parse(JSON.stringify(config.globalImports)) ?? [
    "import prisma from 'TODO: specify globalImports in airent config';",
  ];
  globalImports.push("import { batchLoad } from 'airext';");
  return globalImports;
}

function getSelfLoaderLines() /* Code[] */ {
  const auxiliaryFields = getAuxiliaryFields();
  const beforeLine = `if (keys.length === 0) { return []; }`;
  const afterLine = `return (this as any).fromArray(loadedModels);`;
  if (auxiliaryFields.length === 0) {
    const loadedModelsLine = `const loadedModels = ${getSelfLoadedModels()};`;
    return [beforeLine, loadedModelsLine, afterLine];
  }
  const { entityClass } = getThisEntityStrings();
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
  const prismaModelsLine = `const prismaModels = ${getSelfLoadedModels()};`;
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
  const { entityClass } = getThisEntityStrings();
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
