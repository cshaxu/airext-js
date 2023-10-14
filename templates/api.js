/* eslint-disable */

function isCursorField(field) {
  return !!field.cursor && isExternalField(field);
}

function getPluralEntityName() {
  return pluralize(getThisEntityStrings().entName);
}

function getOneEntityVarName() {
  return toCamelCase(getThisEntityStrings().entName);
}

function getManyEntitiesVarName() {
  return toCamelCase(getPluralEntityName());
}

function getCursorName() {
  return `Many${getPluralEntityName()}Cursor`;
}

function getManyResponseName() {
  return `Many${getPluralEntityName()}Response`;
}

function getOneResponseName() {
  return `One${getThisEntityStrings().entName}Response`;
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

function getServiceName() {
  return `${getThisEntityStrings().entName}Service`;
}

function getGetManyQueryName() {
  return `GetMany${getPluralEntityName()}Query`;
}

function getGetOneParamsName() {
  return `GetOne${getThisEntityStrings().entName}Params`;
}

function getCreateOneBodyName() {
  return `CreateOne${getThisEntityStrings().entName}Body`;
}

function getUpdateOneBodyName() {
  return `UpdateOne${getThisEntityStrings().entName}Body`;
}

function getDeleteOneBodyName() {
  return `DeleteOne${getThisEntityStrings().entName}Body`;
}
