// A stand-in for react in unit tests of lib hooks that call useMemo, useState or useEffect.
export const useMemo = <T>(fn: () => T) => fn();
export const useCallback = <T>(fn: T) => fn;
export const useRef = <T>(value: T) => ({ current: value });
export const useEffect = () => {};
export const useLayoutEffect = () => {};
export const useState = <T>(value: T | (() => T)) => [
  typeof value === "function" ? (value as () => T)() : value,
  () => {},
];
export const useDebugValue = () => {};
export const useSyncExternalStore = <T>(_subscribe: unknown, get: () => T) => get();
export default {
  useDebugValue,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
};
