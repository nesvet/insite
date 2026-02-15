import {
	deleteProps,
	getAll,
	intersection,
	reAdd,
	removeAll
} from "@nesvet/n";
import type { AbilitiesSchema } from "insite-common";
import type { ChangeStreamDocument, CollectionIndexes, WatchedCollection } from "insite-db";
import type { AbilityParam, GenericAbilities } from "../abilities/types";
import type { Users } from "../users";
import { Role } from "./Role";
import { basisSchema } from "./schema";
import type { NewRole, RoleDoc, RolesOptions } from "./types";


const indexes: CollectionIndexes = [
	[ { involves: 1 } ]
];

function preventDirectDelete() {
	throw new Error("Direct usage of roles collection.deleteOne or .deleteMany is forbidden. Use roles.deleteRole instead.");
}


export class Roles<AS extends AbilitiesSchema> extends Map<string, Role<AS>> {
	constructor(users: Users<AS>, options: RolesOptions = {}) {
		super();
		
		const {
			root: rootProps,
			...initOptions
		} = options;
		
		this.users = users;
		this.collections = users.collections;
		this.abilities = users.abilities;
		
		this.root = new Role<AS>(this, {
			...rootProps,
			_id: "root",
			involves: [],
			abilities: this.abilities.getDefaultAbilities(),
			title: "Root",
			description: "Root",
			meta: {},
			createdAt: Date.now()
		});
		
		this.initOptions = initOptions;
		
	}
	
	users;
	collections;
	collection!: WatchedCollection<RoleDoc> & {
		/** @deprecated Direct usage of roles collection.deleteOne is forbidden. Use roles.deleteRole instead. */
		deleteOne: typeof preventDirectDelete;
		
		/** @deprecated Direct usage of roles collection.deleteMany is forbidden. Use roles.deleteRole instead. */
		deleteMany: typeof preventDirectDelete;
	};
	
	abilities;
	root;
	private initOptions?;
	
	async init() {
		
		if (!this.users.isInited) {
			const {
				schema: customSchema,
				indexes: customIndexes,
				collection: collectionOptions
			} = this.initOptions!;
			
			if (customSchema) {
				if (customSchema.required)
					removeAll(customSchema.required as string[], basisSchema.required as string[]);
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
				await this.collections.ensure<RoleDoc>("roles", { ...collectionOptions, schema }),
				{
					deleteOne: preventDirectDelete,
					deleteMany: preventDirectDelete
				}
			);
			
			await this.collection.ensureIndexes([ ...indexes, ...customIndexes ?? [] ]);
			
			await this.#maintain();
			
			for await (const roleDoc of this.collection.find()) {
				if (this.abilities.adjust(roleDoc.abilities))
					await this.collection.updateOne({ _id: roleDoc._id }, { $set: { abilities: roleDoc.abilities } });
				
				this.load(roleDoc);
			}
			
			this.update();
			
			this.collection.onChange(this.#handleCollectionChange);
			
			delete this.initOptions;
		}
		
	}
	
	async #maintain() {
		
		await this.collection.updateMany({ meta: { $exists: false } }, { $set: { meta: {} } });
		
	}
	
	#handleCollectionChange = (next: ChangeStreamDocument<RoleDoc>) => {
		switch (next.operationType) {
			case "insert": {
				new Role<AS>(this, next.fullDocument);
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
	
	load(roleDoc: RoleDoc) {
		new Role<AS>(this, roleDoc);
		
	}
	
	resolve(role: Role<AS>, involvedBy: Role<AS>[]) {
		involvedBy = [ role, ...involvedBy ];
		
		for (const involvedRoleId of role.ownInvolveIds) {
			const involvedRole = this.get(involvedRoleId);
			if (involvedRole) {
				for (const involvedByRole of involvedBy) {
					reAdd(involvedByRole.involves, involvedRole);
					this.abilities.merge(involvedByRole.inheritedAbilities as GenericAbilities, involvedRole.abilities as GenericAbilities);
				}
				if (involvedRole !== role)
					this.resolve(involvedRole, involvedBy);
			}
		}
		
	}
	
	sorted: Role<AS>[] = [];
	
	#sortRoles(a: Role<AS>, b: Role<AS>) {
		return (
			(b.involves.size - a.involves.size) || (
				(a.title && b.title) ?
					a.title > b.title ? 1 : a.title < b.title ? -1 : 0 :
					a.title ?
						-1 :
						b.title ?
							1 :
							a._id > b._id ?
								1 :
								a._id < b._id ?
									-1 :
									0
			)
		);
	}
	
	update() {
		
		const array = [ ...this.values() ];
		
		this.root.ownInvolveIds = [];
		for (const role of array) {
			if (role !== this.root && !array.some(anotherRole => anotherRole.ownInvolveIds.includes(role._id)))
				this.root.ownInvolveIds.push(role._id);
			role.involves.clear();
			role.abilities = structuredClone(role.ownAbilities);
			role.inheritedAbilities = {};
		}
		
		this.root.involves.add(this.root);
		this.resolve(this.root, []);
		
		for (const role of array)
			role.ownInvolves = getAll(this, role.ownInvolveIds, true).sort(this.#sortRoles).reverse();
		
		const sorted = [ this.root ];
		
		for (let i = 0; i < sorted.length; i++) {
			const role = sorted[i];
			for (const involvedRole of role.ownInvolves) {
				const involvedRoleIndex = sorted.indexOf(involvedRole);
				if (~involvedRoleIndex) {
					sorted.splice(involvedRoleIndex, 1);
					i--;
				}
				sorted.splice(i + 1, 0, involvedRole);
			}
		}
		
		let _o = 0;
		for (const role of sorted) {
			this.abilities.merge(role.abilities as GenericAbilities, role.inheritedAbilities as GenericAbilities);
			role._o = _o++;
		}
		
		this.sorted = sorted;
		
		if (this.users.isInited)
			this.users.update(true);
		
	}
	
	async create({ _id, involves, title, description, ...restProps }: NewRole) {
		
		await this.collection.insertOne({
			_id,
			involves: involves || [],
			abilities: {},
			title: title ?? "",
			description: description ?? "",
			meta: {},
			...deleteProps(restProps, [ "abilities" ]),
			createdAt: Date.now()
		});
		
		return _id;
	}
	
	async updateRole(roleId: string, updates: Omit<RoleDoc, "abilities" | "createdAt">) {
		const role = this.get(roleId);
		
		if (!role)
			return false;
		
		if (updates.involves) {
			removeAll(updates.involves, [ roleId ]);
			
			for (const involvedRoleId of updates.involves)
				if (this.get(involvedRoleId)?.involves.has(role))
					removeAll(updates.involves, [ involvedRoleId ]);
			
			updates.involves = this.cleanUpIds(updates.involves);
		}
		
		await this.collection.updateOne({ _id: roleId }, { $set: updates });
		
		return true;
	}
	
	deleteRole(role: Role<AS> | string) {
		const _id = typeof role == "string" ? role : role._id;
		
		return this.collection.bulkWrite([
			{ updateMany: { filter: { involves: _id }, update: { $pullAll: { involves: [ _id ] } } } },
			{ deleteOne: { filter: { _id } } }
		]);
	}
	
	cleanUpIds(ids: string[]) {
		const roles = intersection(this.sorted, getAll(this, ids, true));
		
		const cleanedUpIds = [];
		
		for (const role of roles)
			if (roles.every(anotherRole => anotherRole === role || !anotherRole.involves.has(role)))
				cleanedUpIds.push(role._id);
		
		return cleanedUpIds;
	}
	
	async setAbility(roleId: string, abilityLongId: string, set: boolean) {
		const role = this.get(roleId);
		
		if (!role)
			return false;
		
		await this.collection.updateOne({ _id: roleId }, { $set: {
			abilities:
				set ?
					this.abilities.setAbility(role.ownAbilities, abilityLongId) :
					this.abilities.unsetAbility(role.ownAbilities, abilityLongId)
		} });
		
		return true;
	}
	
	async setAbilityParam(roleId: string, abilityLongId: string, paramId: string, value: AbilityParam) {
		const role = this.get(roleId);
		
		if (!role)
			return false;
		
		await this.collection.updateOne({ _id: roleId }, { $set: {
			abilities: this.abilities.setParam(role.ownAbilities, abilityLongId, paramId, value)
		} });
		
		return true;
	}
	
}
