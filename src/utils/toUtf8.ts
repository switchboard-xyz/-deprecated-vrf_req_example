export const toUtf8 = (array): string => {
  return String.fromCharCode(...array).replace(/\u0000/g, "");
};
