import { isNil, isUndefined, omit, omitBy } from "lodash-es";

type LoadKey = { [x: string]: any };

async function batchLoad<T>(
  executor: (query: any) => Promise<T[]>,
  keys: LoadKey[],
  limit: number = 1000
): Promise<T[]> {
  const array = new Array<T>();
  const where = buildWhere(keys);
  let offset = 0;
  let batchSize = 0;
  do {
    const query = { where, skip: offset, take: limit };
    const batch = await executor(query);
    array.push(...batch);
    batchSize = batch.length;
    offset += batchSize;
  } while (batchSize === limit);
  return array;
}

function buildWhere(loadKeys: LoadKey[]): LoadKey {
  if (loadKeys.length === 0) {
    return {};
  }
  const map = loadKeys.reduce((acc, loadKey) => {
    Object.entries(loadKey).forEach((entry) => {
      const array = acc[entry[0]] ?? [];
      array.push(entry[1]);
      acc[entry[0]] = array;
    });
    return acc;
  }, {} as { [x: string]: any[] });
  const allKeys = Object.keys(map);
  const singleKeys = Object.entries(map)
    .filter((entry: [string, any[]]) => new Set(entry[1]).size === 1)
    .map((entry) => entry[0]);
  const singleKeySet = new Set(singleKeys);
  const multiKeys = allKeys.filter((key) => !singleKeySet.has(key));
  const where = Object.entries(loadKeys[0])
    .filter((entry) => singleKeySet.has(entry[0]))
    .reduce((acc, entry) => {
      acc[entry[0]] = entry[1];
      return acc;
    }, {} as LoadKey);
  if (multiKeys.length === 0) {
    return where;
  }
  if (multiKeys.length === 1) {
    where[multiKeys[0]] = { in: map[multiKeys[0]] };
    return where;
  }
  where["OR"] = loadKeys.map((loadKey) => omit(loadKey, singleKeys));
  return where;
}

function getMin<T>(array: T[]): T | null {
  return array.reduce(
    (acc, value) =>
      isNil(value) ? acc : isNil(acc) ? value : acc < value ? acc : value,
    null as T | null
  );
}

function getMax<T>(array: T[]): T | null {
  return array.reduce(
    (acc, value) =>
      isNil(value) ? acc : isNil(acc) ? value : acc > value ? acc : value,
    null as T | null
  );
}

function toQueryString(query: LoadKey): string {
  query = omitBy(query, isUndefined);
  Object.keys(query)
    .filter((key) => query[key] instanceof Date)
    .forEach((key) => (query[key] = query[key].toISOString()));
  return new URLSearchParams(query).toString();
}

export { batchLoad, buildWhere, getMax, getMin, toQueryString };
