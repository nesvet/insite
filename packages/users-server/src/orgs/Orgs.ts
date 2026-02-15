import {
	_ids,
	deleteProps,
	EmptyArray,
	EmptySet,
	removeAll,
	sort,
	union,
	without
} from "@nesvet/n";
import type { AbilitiesSchema } from "insite-common";
import {
	ChangeStreamDocument,
	CollectionIndexes,
	newObjectIdString,
	WatchedCollection
} from "insite-db";
import type { User, Users } from "../users";
import { Org } from "./Org";
import { basisSchema } from "./schema";
import type { NewOrg, OrgDoc, OrgsOptions } from "./types";


const indexes: CollectionIndexes = [
	[ { owners: 1 } ]
];

function preventDirectDelete() {
	throw new Error("Direct usage of orgs collection.deleteOne or .deleteMany is forbidden. Use orgs.deleteOrg instead.");
}


export class Orgs<AS extends AbilitiesSchema> extends Map<string, Org<AS>> {
	constructor(users: Users<AS>, options: OrgsOptions = {}) {
		super();
		
		this.users = users;
		this.collections = users.collections;
		
		this.preinitOptions = options;
		
	}
	
	users;
	collections;
	private preinitOptions?;
	
	collection!: WatchedCollection<OrgDoc> & {
		/** @deprecated Direct usage of roles collection.deleteOne is forbidden. Use orgs.deleteOrg instead. */
		deleteOne: typeof preventDirectDelete;
		
		/** @deprecated Direct usage of roles collection.deleteMany is forbidden. Use orgs.deleteOrg instead. */
		deleteMany: typeof preventDirectDelete;
	};
	
	null!: Org<AS> & { _id: null };
	
	#isPreinited = false;
	
	async preinit() {
		
		if (!this.#isPreinited) {
			this.#isPreinited = true;
			
			const {
				schema: customSchema,
				indexes: customIndexes,
				null: nullProps,
				collection: collectionOptions
			} = this.preinitOptions!;
			
			if (customSchema) {
				if (customSchema.required)
					removeAll(customSchema.required as string [], basisSchema.required as string[]);
				if (customSchema.properties)
					deleteProps(customSchema, Object.keys(basisSchema.properties!));
			}
			
			const schema = {
				...basisSchema,
				...customSchema,
				required: [ ...basisSchema.required as string[], ...customSchema?.required as string[] ?? [] ],
				properties: { ...basisSchema.properties, ...customSchema?.properties }
			};
			
			this.collection = Object.assign(
				await this.collections.ensure<OrgDoc>("orgs", { ...collectionOptions, schema }),
				{
					deleteOne: preventDirectDelete,
					deleteMany: preventDirectDelete
				}
			);
			
			// TODO: customIndexes should be moved to collectionOptions
			await this.collection.ensureIndexes([ ...indexes, ...customIndexes ?? [] ]);
			
			this.null = Object.assign(
				new Org<AS>(this, {
					...nullProps,
					_id: "",
					title: "",
					note: "",
					owners: [],
					meta: {},
					createdAt: Date.now()
				}),
				{
					_id: null,
					ownerIds: new EmptyArray(),
					ownerOrgs: new EmptySet(),
					ownerUsers: new EmptySet(),
					slaveOrgs: new EmptySet()
				}
			);
			
			await this.#maintain();
			
			for await (const orgDoc of this.collection.find())
				this.load(orgDoc);
			
			delete this.preinitOptions;
		}
		
	}
	
	async #maintain() {
		
		await this.collection.updateMany({ meta: { $exists: false } }, { $set: { meta: {} } });
		
	}
	
	init() {
		
		if (!this.users.isInited) {
			this.update();
			
			this.collection.onChange(this.#handleCollectionChange);
		}
		
	}
	
	#handleCollectionChange = (next: ChangeStreamDocument<OrgDoc>) => {
		switch (next.operationType) {
			case "insert": {
				new Org<AS>(this, next.fullDocument);
				break;
			}
			
			case "replace":
				void this.get(next.documentKey._id)?.update(next.fullDocument);
				break;
			
			case "update":
				void this.get(next.documentKey._id)?.update(next.updateDescription.updatedFields!);
				break;
			
			case "delete":
				void this.get(next.documentKey._id)?.delete();
		}
		
	};
	
	load(orgDoc: OrgDoc) {
		new Org<AS>(this, orgDoc);
		
	}
	
	#resolve(org: Org<AS>, slaveOrgs: Org<AS>[]) {
		slaveOrgs = [ org, ...slaveOrgs ];
		
		for (const ownerOrg of org.ownerOrgs) {
			this.#resolve(ownerOrg, slaveOrgs);
			for (const slaveOrg of slaveOrgs)
				ownerOrg.slaveOrgs.add(slaveOrg);
		}
		
	}
	
	sorted: Org<AS>[] = [];
	
	update() {
		
		const array = [ ...this.values() ];
		const sorted = [];
		
		for (const org of array) {
			org.ownerOrgs.clear();
			org.ownerUsers.clear();
			org.slaveOrgs.clear();
			
			for (const ownerId of org.ownerIds) {
				const ownerOrg = this.get(ownerId);
				if (ownerOrg)
					org.ownerOrgs.add(ownerOrg);
				else {
					const ownerUser = this.users.get(ownerId);
					if (ownerUser)
						org.ownerUsers.add(ownerUser);
				}
			}
			
			if (!org.ownerOrgs.size && org._id)
				sorted.push(org);
		}
		
		for (const org of array)
			if (!array.some(anotherOrg => anotherOrg.ownerOrgs.has(org)))
				this.#resolve(org, []);
		
		sorted.sort(this.#sortOrgs);
		for (const org of array)
			sort(org.slaveOrgs, this.#sortOrgs);
		
		for (let i = 0; i < sorted.length; i++) {
			const org = sorted[i];
			for (const slaveOrg of [ ...org.slaveOrgs ].reverse())
				if (slaveOrg.ownerOrgs.has(org)) {
					const slaveOrgIndex = sorted.indexOf(slaveOrg);
					if (~slaveOrgIndex) {
						sorted.splice(slaveOrgIndex, 1);
						i--;
					}
					sorted.splice(i + 1, 0, slaveOrg);
				}
		}
		for (let o = 0, { length } = sorted; o < length;)
			sorted[o]._o = o++;
		
		this.sorted = sorted;
		
		if (this.users.isInited)
			this.users.update();
		
	}
	
	#sortOrgs(a: Org<AS>, b: Org<AS>) {
		return (
			(b.slaveOrgs.size - a.slaveOrgs.size) || (
				a.title > b.title ?
					1 :
					a.title < b.title ?
						-1 :
						0
			)
		);
	}
	
	async create({ title, note, ...restProps }: NewOrg) {
		
		const _id = newObjectIdString();
		
		await this.collection.insertOne({
			_id,
			title: title ?? "",
			note: note ?? "",
			meta: {},
			...deleteProps(restProps, [ "_id" ]),
			createdAt: Date.now()
		});
		
		return _id;
	}
	
	async updateOrg(_id: string, updates: Omit<OrgDoc, "_id" | "createdAt">, byUser?: User<AS>) {
		const org = this.get(_id)!;
		
		if (!org)
			return false;
		
		if (updates.owners)
			updates.owners =
				this.users.sortIds(
					union(
						byUser ?
							without(org.ownerIds, byUser.slaveIds) :
							[],
						without(updates.owners, [ _id, ..._ids(org.slaveOrgs) ])
					)
				);
		
		await this.collection.updateOne({ _id }, { $set: updates });
		
		return true;
	}
	
	deleteOrg(org: Org<AS> | string) {
		const _id = typeof org == "string" ? org : org._id;
		
		return this.collection.bulkWrite([
			{ updateMany: { filter: { owners: _id }, update: { $pullAll: { owners: [ _id ] } } } },
			{ deleteOne: { filter: { _id } } }
		]);
	}
	
	replaceMap = new Map<string, string>();
	
	replaceHandlers = new Set<(fromId: string, toId: string | null) => Promise<void> | void>();
	
	async replace(fromId: string) {
		const toId = this.replaceMap.get(fromId) ?? null;
		if (toId)
			this.replaceMap.delete(fromId);
		
		for (const handler of this.replaceHandlers)
			await handler(fromId, toId);
		
	}
	
}
