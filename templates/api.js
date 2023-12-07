/* eslint-disable */

/**
 * SCHEMA FLAGS
 * - internal: false | undefined, top-level flag, false to skip generating ManyResponse/OneResponse
 * - api: object | undefined, top-level field, defined to generate api entrypoints, service methods and axios sdks
 */

/**********/
/* STRING */
/**********/

function getApiPackageName() {
  const prefix = toKababCase(toTitleCase(schema.entityName));
  const suffix = getModuleSuffix();
  return `${prefix}-api${suffix}`;
}

function getOneEntityVarName() {
  return toCamelCase(schema.entityName);
}

function getManyEntitiesVarName() {
  return toCamelCase(pluralize(schema.entityName));
}

function getCursorName() {
  return `Many${toTitleCase(pluralize(schema.entityName))}Cursor`;
}

function getManyResponseName() {
  return `Many${toTitleCase(pluralize(schema.entityName))}Response`;
}

function getOneResponseName() {
  return `One${toTitleCase(schema.entityName)}Response`;
}

function getServiceName() {
  return `${toTitleCase(schema.entityName)}Service`;
}

function getGetManyQueryName() {
  return `GetMany${toTitleCase(pluralize(schema.entityName))}Query`;
}

function getGetOneParamsName() {
  return `GetOne${toTitleCase(schema.entityName)}Params`;
}

function getCreateOneBodyName() {
  return `CreateOne${toTitleCase(schema.entityName)}Body`;
}

function getUpdateOneBodyName() {
  return `UpdateOne${toTitleCase(schema.entityName)}Body`;
}

/***********/
/* BOOLEAN */
/***********/

function isCursorField(field) {
  return !!field.cursor && isExternalField(field);
}

function isDateTypeField(field) {
  const fieldTypeName = toPrimitiveTypeName(field.type);
  return fieldTypeName === "Date";
}

function hasApiMethod(methodName) {
  return !!schema.api?.methods?.includes(methodName);
}

function hasGetMany() {
  return hasApiMethod("getMany");
}

function hasGetOne() {
  return hasApiMethod("getOne");
}

function hasCreateOne() {
  return hasApiMethod("create");
}

function hasUpdateOne() {
  return hasApiMethod("update");
}

function hasDeleteOne() {
  return hasApiMethod("delete");
}

function hasInternalGetOne() {
  return hasGetOne() || hasCreateOne() || hasUpdateOne() || hasDeleteOne();
}
