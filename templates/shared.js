/* eslint-disable */

function toCamelCase(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

function pluralize(word) {
  if (typeof word !== "string") {
    throw new Error("Input must be a string");
  }

  // Define some common rules for pluralization
  const pluralRules = [
    [/(ax|test|Ax|Test)is$/, "$1es"],
    [/(alias|status|Alias|Status)$/, "$1es"],
    [/(bu|Bu)s$/, "$1ses"],
    [/(buffal|tomat|Buffal|Tomat)o$/, "$1oes"],
    [/(hive|Hive)$/, "$1s"],
    [/(matr|vert|ind|Matr|Vert|Ind)ix|ex$/, "$1ices"],
    [/(octop|vir|Octoo|Vir)us$/, "$1i"],
    [/(quiz|Quiz)$/, "$1zes"],
    [/(x|ch|ss|sh)$/, "$1es"],
    [/([mlML])ouse$/, "$1ice"],
    [/([ti])um$/, "$1a"],
    [/([^aeiouy]|qu)y$/, "$1ies"],
    [/(?:([^f])fe|([lr])f)$/, "$1$2ves"],
    [/sis$/, "ses"],
    [/s$/, "es"],
    [/$/, "s"],
  ];

  // Check if the word matches any of the rules and apply the first matching rule
  for (const [pattern, replacement] of pluralRules) {
    console.log("replacement" + pattern.test(word));
    if (pattern.test(word)) {
      return word.replace(pattern, replacement);
    }
  }

  return word + "s"; // If no rule matched, add 's' as a default pluralization
}
