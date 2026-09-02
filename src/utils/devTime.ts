/** __DEV__-guarded console.time wrappers. Metro strips the timer calls from production. */

export function withDevTime<T>(label: string, fn: () => T): T {
  if (__DEV__) {
    console.time(label);
  }
  try {
    return fn();
  } finally {
    if (__DEV__) {
      console.timeEnd(label);
    }
  }
}

export async function withDevTimeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (__DEV__) {
    console.time(label);
  }
  try {
    return await fn();
  } finally {
    if (__DEV__) {
      console.timeEnd(label);
    }
  }
}
