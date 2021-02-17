import * as cryptly from "cryptly"
import * as cosmos from "@cfworker/cosmos"
import { Document } from "./Document"

export class Backend<T> {
	constructor(private client: cosmos.CosmosClient) {}
	async get(document: { key: cryptly.Identifier; shard: string }): Promise<Document<T> | undefined> {
		return this.fromResponse(
			await this.client.getDocument<Document<T> & cosmos.Document>({
				docId: document.key,
				partitionKey: document.shard,
			})
		)
	}
	async create(document: { key: cryptly.Identifier; shard: string; value: T }) {
		const parameters = {
			partitionKey: document.shard,
			document: JSON.stringify(document),
		}
		console.log("request", parameters)
		const response = await this.client.createDocument<Document<T> & cosmos.Document>(parameters)
		console.log("response", response)
		return this.fromResponse(response)
	}
	async set(document: { key: cryptly.Identifier; shard: string; value: T }): Promise<Document<T> | undefined> {
		return this.fromResponse(
			await this.client.createDocument<Document<T> & cosmos.Document>({
				partitionKey: document.shard,
				document: JSON.stringify(document),
				isUpsert: true,
			})
		)
	}
	async replace(document: Document<T>): Promise<Document<T> | undefined> {
		return this.fromResponse(
			await this.client.replaceDocument<Document<T> & cosmos.Document>({
				docId: document.key,
				partitionKey: document.shard,
				document: JSON.stringify(document),
				ifMatch: document.eTag,
			})
		)
	}
	async delete(document: { key: cryptly.Identifier; shard: string }): Promise<Document<T> | false> {
		const response = await this.client.deleteDocument({ docId: document.key, partitionKey: document.shard })
		return response.status == 200 ? await response.json() : false
	}
	private async fromResponse(
		response: cosmos.ItemResponse<Document<T> & cosmos.Document>
	): Promise<Document<T> | undefined> {
		const result = response.status == 200 ? await response.json() : undefined
		return result && { key: result.key, shard: result.shard, value: result.value, eTag: result?._etag }
	}
	static async connect<T>(url: string, secret: string, database: string, collection: string): Promise<Backend<T>> {
		const client = new cosmos.CosmosClient({
			endpoint: url,
			masterKey: secret,
			consistencyLevel: "Eventual",
			dbId: database,
			collId: collection,
		})
		return new Backend<T>(client)
	}
}
