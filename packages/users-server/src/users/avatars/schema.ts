import { CollectionSchema } from "insite-db";
import { regexps } from "../../lib";


export const schema: CollectionSchema = {
	required: [
		"_id",
		"type",
		"size",
		"ts",
		"data",
		"meta"
	],
	properties: {
		_id: {
			bsonType: "string",
			pattern: regexps._id.source
		},
		type: {
			bsonType: "string",
			maxLength: 256
		},
		size: {
			bsonType: "number"
		},
		ts: {
			bsonType: "string",
			maxLength: 10
		},
		data: {
			bsonType: "binData"
		},
		meta: {
			bsonType: "object"
		}
	},
	additionalProperties: false
};
