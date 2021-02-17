import * as cryptly from "cryptly"
import { Backend } from "./Backend"

export class Storage<T> {
	constructor(private backend: Backend<T>) {}
	async get(key: string, shard: string): Promise<T | undefined> {
		const result = await this.backend.get({ key, shard })
		return result?.value
	}
	async put(key: string, shard: string, value: T, eTag?: string): Promise<void> {
		key = cryptly.Identifier.toHexadecimal(key, 12).padStart(24, "0").slice(0, 24)
		const result = await (eTag
			? this.backend.replace({ key, shard, value, eTag })
			: this.backend.create({ key, shard, value }))
		console.log("put result", key, result)
	}
	async delete(key: string, shard: string): Promise<boolean> {
		const result = await this.backend.delete({ key, shard })
		return result ? true : false
	}
	async modify(key: string, shard: string, modify: (value: T) => Promise<T>): Promise<boolean> {
		const initial = await this.backend.get({ key, shard })
		let result = false
		if (initial && !initial.lock) {
			const lock = cryptly.Identifier.generate(8)
			const locked = await this.backend.replace({ ...initial, lock })
			if (locked) {
				const modified = await modify(locked.value)
				result = (await this.backend.replace({ ...initial, value: modified, lock: undefined })) ? true : false
			}
		}
		return result
	}
	static async connect<T>(url: string, secret: string, database: string, collection: string): Promise<Storage<T>> {
		const backend = await Backend.connect<T>(url, secret, database, collection)
		return new Storage<T>(backend)
	}
}
