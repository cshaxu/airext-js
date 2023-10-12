/* eslint-disable */

function isCursorField(field) {
  return !!field.cursor && isExternalField(field);
}
