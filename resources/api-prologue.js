/* eslint-disable */

/**
 * SCHEMA FLAGS
 * - internal: false | undefined, top-level flag, false to skip generating ManyResponse/OneResponse
 * - api: object | undefined, top-level field, defined to generate api entrypoints, service methods and axios sdks
 */

/**********/
/* STRING */
/**********/

function getModuleSuffix() /* string */ {
  return config.isModule ? ".js" : "";
}

function getApiPackageName() {
  const prefix = utils.toKababCase(entity.name);
  const suffix = getModuleSuffix();
  return `${prefix}-api${suffix}`;
}

function getOneEntityVarName() {
  return utils.toCamelCase(entity.name);
}

function getManyEntitiesVarName() {
  return utils.toCamelCase(utils.pluralize(entity.name));
}

function getCursorFieldName(field, direction) {
  return `${direction}${utils.toTitleCase(field.name)}`;
}

function getSingularEntName() {
  return utils.toTitleCase(entity.name);
}

function getPluralEntName() {
  return utils.toTitleCase(utils.pluralize(entity.name));
}

function getCursorName() {
  return `Many${getPluralEntName()}Cursor`;
}

function getManyResponseName() {
  return `Many${getPluralEntName()}Response`;
}

function getOneResponseName() {
  return `One${getSingularEntName()}Response`;
}

function getServiceName() {
  return `${getSingularEntName()}Service`;
}

function getGetManyQueryName() {
  return `GetMany${getPluralEntName()}Query`;
}

function getGetOneParamsName() {
  return `GetOne${getSingularEntName()}Params`;
}

function getCreateOneBodyName() {
  return `CreateOne${getSingularEntName()}Body`;
}

function getUpdateOneBodyName() {
  return `UpdateOne${getSingularEntName()}Body`;
}

/***********/
/* BOOLEAN */
/***********/

function isCursorField(field) {
  return (
    !!entity.api?.cursors?.includes(field.name) &&
    utils.isPresentableField(field)
  );
}

function isDateTypeField(field) {
  const fieldTypeName = utils.toPrimitiveTypeName(field.type);
  return fieldTypeName === "Date";
}

function hasApiMethod(methodName) {
  return !!entity.api?.methods?.includes(methodName);
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
