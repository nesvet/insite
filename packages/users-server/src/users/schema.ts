import { CollectionSchema } from "insite-db";
import { regexps } from "../lib";


export const basisSchema: CollectionSchema = {
	required: [
		"_id",
		"email",
		"password",
		"roles",
		"name",
		"org",
		"job",
		"meta",
		"createdAt"
	],
	properties: {
		_id: {
			bsonType: "string",
			pattern: regexps._id.source
		},
		email: {
			bsonType: "string",
			pattern: regexps.email.source
		},
		password: {
			bsonType: "string",
			pattern: regexps.argon2.source
		},
		roles: {
			bsonType: "array",
			uniqueItems: true,
			items: {
				bsonType: "string",
				pattern: regexps.role.source
			},
			additionalItems: false
		},
		name: {
			bsonType: "object",
			required: [
				"first",
				"middle",
				"last"
			],
			properties: {
				first: {
					bsonType: "string",
					maxLength: 512
				},
				middle: {
					bsonType: "string",
					maxLength: 512
				},
				last: {
					bsonType: "string",
					maxLength: 512
				}
			},
			additionalProperties: false
		},
		org: {
			oneOf: [
				{
					bsonType: "string",
					pattern: regexps._id.source
				},
				{
					bsonType: "null"
				}
			]
		},
		job: {
			bsonType: "string",
			maxLength: 512
		},
		avatar: {
			oneOf: [
				{
					bsonType: "string",
					maxLength: 10
				},
				{
					bsonType: "null"
				}
			]
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
