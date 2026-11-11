// A stand-in for @react-native-async-storage/async-storage in unit tests. It keeps values in memory.
export const store = new Map<string, string>();

const AsyncStorage = {
  getItem: async (key: string) => store.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: async (key: string) => {
    store.delete(key);
  },
};

export default AsyncStorage;
