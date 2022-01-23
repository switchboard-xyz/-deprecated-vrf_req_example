export const sleep = (ms: number): Promise<any> =>
  new Promise((s) => setTimeout(s, ms));
