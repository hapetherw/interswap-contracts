import fs from "fs";

/**
 * Simple is object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item: any): boolean {
  return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * Deep merge two objects.
 * @param target
 * @param source
 */
export function mergeDeep(target: any, source: any) {
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  return target;
}

export async function saveJSON(json: object | string, fileName: string) {
  if (typeof json === "string") json = JSON.parse(json);
  const path = `./addresses/${fileName}.json`;
  let obj = {};
  if (fs.existsSync(path)) obj = JSON.parse(fs.readFileSync(path).toString());
  const merged = mergeDeep(obj, json);
  fs.writeFileSync(path, JSON.stringify(merged));
}

export async function loadCommunicators() {
  const path = `./addresses/lz-communications.json`;
  if (fs.existsSync(path)) {
    return JSON.parse(fs.readFileSync(path).toString());
  } else {
    throw Error(`Communications json file does not exists`)
  }
}

export async function getCommunicatorContractByNetwork(network: string) {
  
}
