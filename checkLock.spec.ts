import * as cryptly from "cryptly"
import * as isoly from "isoly"
import { checkLock } from "./checkLock"
import { Document } from "./Document"

describe("Storage tests", () => {
	it("checkLock tests", () => {
		const initialLock: Document<any> = {
			lock: isoly.DateTime.create(new Date(Date.now() - 1000 * 60 * 9.9)) + cryptly.Identifier.generate(8),
			key: "test",
			shard: "test",
			value: {},
		}
		expect(checkLock(initialLock)).toBeTruthy()
		initialLock.lock = isoly.DateTime.create(new Date(Date.now() - 1000 * 60 * 10.1)) + cryptly.Identifier.generate(8)
		expect(checkLock(initialLock)).toBeFalsy()
		initialLock.lock = isoly.DateTime.create(new Date(Date.now())) + cryptly.Identifier.generate(8)
		expect(checkLock(initialLock)).toBeTruthy()
		initialLock.lock = isoly.DateTime.create(new Date(Date.now() - 1000 * 60 * 100)) + cryptly.Identifier.generate(8)
		expect(checkLock(initialLock)).toBeFalsy()
		initialLock.lock = "12345"
		expect(checkLock(initialLock)).toBeFalsy()
		initialLock.lock = "asbda-sda_b23123c1qadavswda231c24q34baw4c214234qa23ca434a"
		expect(checkLock(initialLock)).toBeFalsy()
	})
})
