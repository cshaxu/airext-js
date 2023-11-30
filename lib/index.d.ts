type LoadKey = {
    [x: string]: any;
};
declare function batchLoad<T>(executor: (query: any) => Promise<T[]>, keys: LoadKey[], limit?: number): Promise<T[]>;
declare function buildWhere(loadKeys: LoadKey[]): LoadKey;
declare function getMin<T>(array: T[]): T | null;
declare function getMax<T>(array: T[]): T | null;
export { batchLoad, buildWhere, getMax, getMin };
