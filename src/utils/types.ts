type NonMethodKeys<T> = ({
  [P in keyof T]: T[P] extends Function ? never : P;
} & { [x: string]: never })[keyof T];
export type SafePick<T> = Pick<T, NonMethodKeys<T>>;
