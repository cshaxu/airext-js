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
    utils.isPrimitiveField(field) &&
    utils.isPresentableField(field)
  );
}

function isDateTypeField(field) {
  return field.strings.fieldClass === "Date";
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

/********/
/* CODE */
/********/

function getTypeAfterLines() {
  const lines = [];
  if (!utils.isPresentableEntity(entity)) {
    return lines;
  }
  lines.push("");
  if (entity.deprecated) {
    lines.push("/** @deprecated */");
  }
  lines.push(`export type ${getCursorName()} = {`);
  lines.push("  count: number;");
  entity.fields.filter(isCursorField).forEach((field) => {
    if (field.deprecated) {
      lines.push("  /** @deprecated */");
    }
    lines.push(
      `  ${getCursorFieldName(field, "min")}: ${
        field.strings.fieldResponseType
      } | null;`
    );
    if (field.deprecated) {
      lines.push("  /** @deprecated */");
    }
    lines.push(
      `  ${getCursorFieldName(field, "max")}: ${
        field.strings.fieldResponseType
      } | null;`
    );
  });
  lines.push("};");
  lines.push("");
  if (entity.deprecated) {
    lines.push("/** @deprecated */");
  }
  lines.push(`export type ${getManyResponseName()} = {`);
  lines.push(`  cursor: ${getCursorName()};`);
  if (entity.deprecated) {
    lines.push("  /** @deprecated */");
  }
  lines.push(
    `  ${getManyEntitiesVarName()}: ${entity.strings.responseClass}[];`
  );
  lines.push("};");
  lines.push("");
  if (entity.deprecated) {
    lines.push("/** @deprecated */");
  }
  lines.push(`export type ${getOneResponseName()} = {`);
  if (entity.deprecated) {
    lines.push("  /** @deprecated */");
  }
  lines.push(`  ${getOneEntityVarName()}: ${entity.strings.responseClass};`);
  lines.push("};");
  if (entity.api && hasInternalGetOne()) {
    lines.push("");
    if (entity.deprecated) {
      lines.push("/** @deprecated */");
    }
    lines.push(`export type ${getGetOneParamsName()} = {`);
    entity.api.keys.forEach((key) => {
      const field = utils.queryField(key, entity);
      if (field.deprecated) {
        lines.push("  /** @deprecated */");
      }
      lines.push(`  ${key}: ${field.type};`);
    });
    lines.push("};");
  }
  return lines;
}
