import { ObjectId, type ChangeStream, type ChangeStreamDocument } from "mongodb";
import { maskChangeStreamDocument } from "./masker";
import type { WatchedCollection } from "./types";


export function newObjectIdString() {
	return (new ObjectId()).toString();
}

/** @this ChangeStream */
export function printChangeStreamChangeDetails(this: ChangeStream, next: ChangeStreamDocument) {
	next = maskChangeStreamDocument(next);
	
	const messages = [];
	
	switch (next.operationType) {
		case "insert":
		case "replace":
			messages.push("fullDocument:", next.fullDocument);
			break;
		
		case "update":
			messages.push("_id:", next.documentKey._id, "\n", "updateDescription:", next.updateDescription);
			break;
		
		case "delete":
			messages.push("_id:", next.documentKey._id);
			break;
		
		default:
			messages.push(next);
	}
	
	console.info("🌿🎏", `\x1B[1m${(this.parent as WatchedCollection).collectionName}\x1B[0m`, `\x1B[3m${next.operationType}\x1B[0m`, ...messages);
	
}

/** @this ChangeStream */
export function printChangeStreamError(this: ChangeStream, error: Error) {
	console.error(`🌿❗️ MongoDB ${(this.parent as WatchedCollection).collectionName} Change Stream:\n`, error.stack);
	
}
