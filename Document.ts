import * as cryptly from "cryptly"

export interface Document<T> {
	key: cryptly.Identifier
	shard: string
	value: T
	lock?: cryptly.Identifier
	eTag?: string
}
export namespace Document {
	export function clean<T>(document: Document<T>): Document<T> {
		return { key: document.key, shard: document.shard, value: document.value }
	}
}
