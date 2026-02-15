import { CollectionSchema } from "insite-db";
import { regexps } from "../lib";


export const basisSchema: CollectionSchema = {
	required: [
		"_id",
		"title",
		"note",
		"owners",
		"meta",
		"createdAt"
	],
	properties: {
		_id: {
			bsonType: "string",
			pattern: regexps._id.source
		},
		title: {
			bsonType: "string",
			maxLength: 512
		},
		note: {
			bsonType: "string",
			maxLength: 131072
		},
		owners: {
			bsonType: "array",
			uniqueItems: true,
			items: {
				bsonType: "string",
				pattern: regexps._id.source
			},
			additionalItems: false
		},
		meta: {
			bsonType: "object"
		},
		createdAt: {
			bsonType: "number"
		}
	},
	additionalProperties: false
};
