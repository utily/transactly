import * as isoly from "isoly"
import { Document } from "./Document"

export function checkLock<T>(initial: Document<T> | undefined): isoly.DateTime | undefined {
	let lock: isoly.DateTime | undefined
	lock = initial?.lock?.substring(0, 24)
	lock = isoly.DateTime.is(lock) ? lock : undefined
	// Unlock if 10 minutes has passed.
	if (!lock || Date.now() - Date.parse(lock) > 1000 * 60 * 10)
		lock = undefined
	return lock
}
