type CamelCase<Key extends string> = Key extends `${infer Head}_${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : Key;

export type CamelCasedPropertiesDeep<T> = T extends object
  ? {
      [K in keyof T as K extends string
        ? CamelCase<K>
        : K]: CamelCasedPropertiesDeep<T[K]>;
    }
  : T;
