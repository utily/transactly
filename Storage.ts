import * as cryptly from "cryptly"
import { Backend } from "./Backend"
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
	async delete(key: string, shard: string, eTag?: string): Promise<boolean> {
		return await this.backend.delete({ key, shard, eTag })
	}
	async modify(key: string, shard: string, modify: (value: T) => Promise<T>): Promise<T | undefined> {
		const initial = await this.backend.get({ key, shard })
		let result: Document<T> | undefined
		if (initial && !initial.lock) {
			const lock = cryptly.Identifier.generate(8)
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
