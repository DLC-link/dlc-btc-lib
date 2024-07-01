/// <reference types="node" resolution-mode="require"/>
export declare function shiftValue(value: number): number;
export declare function unshiftValue(value: number): number;
export declare function customShiftValue(value: number, shift: number, unshift: boolean): number;
export declare function truncateAddress(address: string): string;
export declare function createRangeFromLength(length: number): number[];
export declare function isUndefined(value: unknown): value is undefined;
export declare function isDefined<T>(argument: T | undefined): argument is T;
export declare function delay(ms: number): Promise<unknown>;
export declare function reverseBytes(bytes: Buffer): Buffer;
export declare function reverseBytes(bytes: Uint8Array): Uint8Array;
