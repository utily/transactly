import * as cryptly from "cryptly"
import * as isoly from "isoly"
import { Backend } from "./Backend"
import { checkLock } from "./checkLock"
import { Document } from "./Document"
export class Storage<T> {
	constructor(private backend: Backend<T>) {}
	async get(key: string, shard: string): Promise<T | undefined> {
		const result = await this.backend.get({ key, shard })
		return result?.value
	}
	async put(key: string, shard: string, value: T, eTag?: string): Promise<T | undefined> {
		const result = await (eTag
			? this.backend.replace({ key, shard, value, eTag })
			: this.backend.set({ key, shard, value }))
		return result?.value
	}
	async list(shard: string): Promise<T[] | undefined> {
		const result = await this.backend.list({ shard })
		return result?.map(r => r.value)
	}
	async delete(key: string, shard: string, eTag?: string): Promise<boolean> {
		return await this.backend.delete({ key, shard, eTag })
	}
	async modify(key: string, shard: string, modify: (value: T) => Promise<T>): Promise<T | undefined> {
		const initial = await this.backend.get({ key, shard })
		let result: Document<T> | undefined
		let lock: isoly.DateTime | undefined = checkLock<T>(initial)
		if (initial && !lock) {
			lock = isoly.DateTime.now() + cryptly.Identifier.generate(8)
			const locked = await this.backend.replace({ ...initial, lock })
			if (locked) {
				const modified = await modify(locked.value)
				result = await this.backend.replace({ ...locked, value: modified, lock: undefined })
			}
		}
		return result?.value
	}
	static async connect<T>(url: string, secret: string, database: string, collection: string): Promise<Storage<T>> {
		const backend = await Backend.connect<T>(url, secret, database, collection)
		return new Storage<T>(backend)
	}
}
