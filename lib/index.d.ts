declare function batchLoad<T>(loader: (params: any) => Promise<T[]>, params: any, batchSize?: number): Promise<T[]>;
export { batchLoad };
