export function truncateJSON(obj: any, maxArrayLength: number = 3): any {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj
      .slice(0, maxArrayLength)
      .map((item) => truncateJSON(item, maxArrayLength));
  }

  const truncatedObj: { [key: string]: any } = {};
  for (const [key, value] of Object.entries(obj)) {
    truncatedObj[key] = truncateJSON(value, maxArrayLength);
  }

  return truncatedObj;
}
