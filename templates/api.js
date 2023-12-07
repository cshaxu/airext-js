/* eslint-disable */

// strings

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

// booleans

function isCursorField(field) {
  return !!field.cursor && isExternalField(field);
}

function isDateTypeField(field) {
  const fieldTypeName = toPrimitiveTypeName(field.type);
  return fieldTypeName === "Date";
}

function hasGetMany() {
  const method = schema.methods?.getMany;
  return !!method && Object.keys(method).length > 0 && !!method.import?.length;
}

function hasGetOne() {
  const method = schema.methods?.getOne;
  return !!method && Object.keys(method).length > 0 && !!method.keys?.length;
}

function hasCreateOne() {
  const method = schema.methods?.create;
  return (
    hasGetOne() &&
    !!method &&
    Object.keys(method).length > 0 &&
    !!method.import?.length
  );
}

function hasUpdateOne() {
  const method = schema.methods?.update;
  return (
    hasGetOne() &&
    !!method &&
    Object.keys(method).length > 0 &&
    !!method.import?.length
  );
}

function hasDeleteOne() {
  const method = schema.methods?.delete;
  return (
    hasGetOne() &&
    !!method &&
    Object.keys(method).length > 0 &&
    !!method.import?.length
  );
}

function hasExternalGetMany() {
  return !schema.internal && hasGetMany() && !schema.methods.getMany.internal;
}

function hasExternalGetOne() {
  return !schema.internal && hasGetOne() && !schema.methods.getOne.internal;
}

function hasExternalCreateOne() {
  return !schema.internal && hasCreateOne() && !schema.methods.create.internal;
}

function hasExternalUpdateOne() {
  return !schema.internal && hasUpdateOne() && !schema.methods.update.internal;
}

function hasExternalDeleteOne() {
  return !schema.internal && hasDeleteOne() && !schema.methods.delete.internal;
}

function hasManyResponse() {
  return hasExternalGetMany();
}

function hasOneResponse() {
  return (
    hasExternalGetOne() ||
    hasExternalCreateOne() ||
    hasExternalUpdateOne() ||
    hasExternalDeleteOne()
  );
}
