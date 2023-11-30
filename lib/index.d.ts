type LoadKey = {
    [x: string]: any;
};
declare function batchLoad<T>(executor: (query: LoadKey) => Promise<T[]>, keys: LoadKey[], limit?: number): Promise<T[]>;
declare function buildWhere(loadKeys: LoadKey[]): LoadKey;
declare function getMin<T>(array: T[]): T | null;
declare function getMax<T>(array: T[]): T | null;
declare function toQueryString(query: LoadKey): string;
export { batchLoad, buildWhere, getMax, getMin, toQueryString };
