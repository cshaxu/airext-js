async function batchLoad<T>(
  loader: (params: any) => Promise<T[]>,
  params: any,
  batchSize: number = 100
): Promise<T[]> {
  const array = new Array<T>();
  let skip = 0;
  let count = 0;
  do {
    const batch = await loader({ ...params, skip, take: batchSize });
    array.push(...batch);
    count = batch.length;
    skip += count;
  } while (count === batchSize);
  return array;
}

export { batchLoad };
