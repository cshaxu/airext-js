type LoadKey = {
    [x: string]: any;
};
declare function batchLoad<T>(executor: (query: any) => Promise<T[]>, keys: LoadKey[], limit?: number): Promise<T[]>;
declare function buildWhere(loadKeys: LoadKey[]): LoadKey;
export { batchLoad, buildWhere };
