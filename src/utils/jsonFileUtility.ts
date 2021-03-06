import * as fs from 'fs-extra';
var flatten2 = require('flat')


export class JsonFileUtility {
    public static async serializeToFile<T>(path: string, data: T): Promise<void> {
        await fs.ensureFile(path);
        await fs.writeJson(path, data);
    }

    public static async deserializeFromFile<T>(path: string): Promise<T | undefined>;
    public static async deserializeFromFile<T>(path: string, defaultValue: T): Promise<T>;
    public static async deserializeFromFile<T>(path: string, defaultValue?: T): Promise<T | undefined> {
        try {
            return await fs.readJson(path);
        } catch {
            return defaultValue;
        }
    }
}



export function flatten(object) {
    return flatten2(object);
};
