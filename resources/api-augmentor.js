const utils = require("../../airent/resources/utils.js");

/**
 * SCHEMA FLAGS
 * - internal: false | undefined, top-level flag, false to skip generating ManyResponse/OneResponse
 * - api: object | undefined, top-level field, defined to generate api actions and services
 */

function isCursorField(field) {
  return (
    !!field._parent.api?.cursors?.includes(field.name) &&
    utils.isPrimitiveField(field) &&
    utils.isPresentableField(field)
  );
}

function hasApiMethod(entity, methodName) {
  return !!entity.api?.methods?.includes(methodName);
}

// augment entity - add api strings

function addStrings(entity, isVerbose) {
  const pluralEntName = utils.toTitleCase(utils.pluralize(entity.name));
  const singularEntName = utils.toTitleCase(entity.name);
  if (!entity.api) {
    return;
  } else if (isVerbose) {
    console.log(
      `[AIREXT-API/INFO] augmenting ${entity.name} - add strings ...`
    );
  }
  entity.api.strings = {
    manyEntsVar: utils.toCamelCase(utils.pluralize(entity.name)),
    oneEntVar: utils.toCamelCase(entity.name),
    actionClass: `${singularEntName}Action`,
    serviceClass: `${singularEntName}Service`,
    manyCursor: `Many${pluralEntName}Cursor`,
    manyResponse: `Many${pluralEntName}Response`,
    oneResponse: `One${singularEntName}Response`,
    getManyQuery: `GetMany${pluralEntName}Query`,
    getOneParams: `GetOne${singularEntName}Params`,
    createOneBody: `CreateOne${singularEntName}Body`,
    updateOneBody: `UpdateOne${singularEntName}Body`,
    getManyAction: `getMany${pluralEntName}`,
    getOneAction: `getOne${singularEntName}`,
    createOneAction: `createOne${singularEntName}`,
    updateOneAction: `updateOne${singularEntName}`,
    deleteOneAction: `deleteOne${singularEntName}`,
  };
  const hasGetOne = hasApiMethod(entity, "getOne");
  const hasUpdateOne = hasApiMethod(entity, "updateOne");
  const hasDeleteOne = hasApiMethod(entity, "deleteOne");
  entity.api.booleans = {
    hasGetMany: hasApiMethod(entity, "getMany"),
    hasGetOne,
    hasCreateOne: hasApiMethod(entity, "createOne"),
    hasUpdateOne,
    hasDeleteOne,
    hasGetOneRequest: hasGetOne || hasUpdateOne | hasDeleteOne,
  };
  entity.fields.filter(isCursorField).forEach((field) => {
    field.strings.minVar = `min${utils.toTitleCase(field.name)}`;
    field.strings.maxVar = `max${utils.toTitleCase(field.name)}`;
  });
}

// augment entity - add api code

function buildAfterType(entity) /* Code[] */ {
  const lines = [];
  if (!utils.isPresentableEntity(entity) || !entity.api) {
    return lines;
  }
  lines.push("");
  if (entity.deprecated) {
    lines.push("/** @deprecated */");
  }
  lines.push(`export type ${entity.api.strings.manyCursor} = {`);
  lines.push("  count: number;");
  entity.fields
    .filter((f) => f.strings.minVar && f.strings.maxVar)
    .forEach((field) => {
      if (field.deprecated) {
        lines.push("  /** @deprecated */");
      }
      lines.push(
        `  ${field.strings.minVar}: ${field.strings.fieldResponseType} | null;`
      );
      if (field.deprecated) {
        lines.push("  /** @deprecated */");
      }
      lines.push(
        `  ${field.strings.maxVar}: ${field.strings.fieldResponseType} | null;`
      );
    });
  lines.push("};");
  lines.push("");
  if (entity.deprecated) {
    lines.push("/** @deprecated */");
  }
  lines.push(`export type ${entity.api.strings.manyResponse} = {`);
  lines.push(`  cursor: ${entity.api.strings.manyCursor};`);
  if (entity.deprecated) {
    lines.push("  /** @deprecated */");
  }
  lines.push(
    `  ${entity.api.strings.manyEntsVar}: ${entity.strings.responseClass}[];`
  );
  lines.push("};");
  lines.push("");
  if (entity.deprecated) {
    lines.push("/** @deprecated */");
  }
  lines.push(`export type ${entity.api.strings.oneResponse} = {`);
  if (entity.deprecated) {
    lines.push("  /** @deprecated */");
  }
  lines.push(
    `  ${entity.api.strings.oneEntVar}: ${entity.strings.responseClass};`
  );
  lines.push("};");
  return lines;
}

function addCode(entity, isVerbose) {
  if (isVerbose) {
    console.log(
      `[AIREXT-PRISMA/INFO] augmenting ${entity.name} - add code ...`
    );
  }
  entity.code.afterType = buildAfterType(entity);
}

function augment(data, isVerbose) {
  const { entityMap } = data;

  const entityNames = Object.keys(entityMap).sort();
  const entities = entityNames.map((n) => entityMap[n]);
  entities.forEach((entity) => addStrings(entity, isVerbose));
  entities.forEach((entity) => addCode(entity, isVerbose));
}

module.exports = { augment };
