import * as cosmos from "@cfworker/cosmos"
import * as http from "cloud-http"
import * as cloudRouter from "cloud-router"
import * as transactly from "./index"

declare const cosmosUrl: string
declare const cosmosKey: string
declare const cosmosDatabase: string
declare const cosmosCollection: string

const router = new cloudRouter.Router()
const storage = transactly.Storage.connect<{ value: string }>(cosmosUrl, cosmosKey, cosmosDatabase, cosmosCollection)

async function create(request: http.Request): Promise<http.Response.Like | any> {
	const s = await storage
	const body = await request.body
	console.log("create", request.parameter.key, request.parameter.shard, body)
	await s.put(request.parameter.key, request.parameter.shard, body)
	const result = await s.get(request.parameter.key, request.parameter.shard)
	console.log("result", result)
	return result ?? "no result"
}
router.add("POST", "/:shard/:key", create)

async function fetch(request: http.Request): Promise<http.Response.Like | any> {
	const client = new cosmos.CosmosClient({
		endpoint: cosmosUrl,
		masterKey: cosmosKey,
		consistencyLevel: "Session",
		// dbId: cosmosDatabase,
		// collId: cosmosCollection,
		fetch: async (input, init) => {
			if (typeof input != "string")
				console.log("headers", Object.fromEntries(input.headers.entries()))
			console.log("fetch", input, init)
			const response = await global.fetch(input, init)
			console.log("fetch response", response, Object.fromEntries(response.headers.entries()), await response.json())
			return response
		},
	})
	// const databases = await client.getDatabases()
	// console.log("databases", databases)
	const collection = await client.getCollection({
		dbId: cosmosDatabase,
		collId: cosmosCollection,
		consistencyLevel: "Eventual",
	})
	console.log("collection", collection)
	return "no result"
}
router.add("GET", "/test", fetch)

addEventListener("fetch", event => {
	event.respondWith(router.handle(http.Request.from(event.request)).then(http.Response.to))
})
