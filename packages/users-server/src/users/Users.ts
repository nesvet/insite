import { hash, verify } from "@node-rs/argon2";
import EventEmitter from "eventemitter3";
import {
	_ids,
	deleteProps,
	removeAll,
	StatefulPromise,
	without
} from "@nesvet/n";
import type { AbilitiesSchema } from "insite-common";
import {
	ChangeStreamDocument,
	CollectionIndexes,
	Collections,
	newObjectIdString,
	WatchedCollection
} from "insite-db";
import { AbilitiesMap } from "../abilities";
import { Orgs } from "../orgs";
import { Org } from "../orgs/Org";
import { Roles } from "../roles";
import { Sessions } from "../sessions";
import { Session } from "../sessions/Session";
import type { SessionDoc } from "../sessions/types";
import { Avatars } from "./avatars";
import { basisSchema } from "./schema";
import { User } from "./User";
import type { NewUser, Options, UserDoc } from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any */


const indexes: CollectionIndexes = [
	[ { email: 1 }, { unique: true } ],
	[ { org: 1 } ]
];


export class Users<AS extends AbilitiesSchema> extends Map<string, User<AS>> {
	constructor(collections: Collections, options: Options<AS>) {
		super();
		
		const eventEmitter = new EventEmitter() as EventEmitter & {
			_events: Record<string, object>;
			_eventsCount: number;
		};
		this.#eventEmitter = eventEmitter;
		this._events = eventEmitter._events;
		this._eventsCount = eventEmitter._eventsCount;
		this.emit = eventEmitter.emit;
		this.on = eventEmitter.on as unknown as (...args: any[]) => this;
		this.once = eventEmitter.once;
		this.addListener = eventEmitter.addListener;
		this.off = eventEmitter.off;
		this.removeListener = eventEmitter.removeListener;
		
		this.collections = collections;
		
		this.abilities = new AbilitiesMap<AS>(options.abilities);
		
		this.initOptions = options;
		
		void this.init();
		
	}
	
	#eventEmitter;
	_events;
	_eventsCount;
	emit;
	
	on(event: "user-create" | "user-is-online" | "user-permissions-change", callback: (user: User<AS>) => void): this;
	on(event: "session-delete", callback: (session: Session<AS>) => void): this;
	on<T extends string | symbol>(event: T, callback: (...args: any[]) => void, context?: any) {
		this.#eventEmitter.on(event, callback, context);
		
		return this;
	}
	
	once;
	addListener;
	off;
	removeListener;
	
	private initOptions?;
	
	collections;
	abilities;
	
	collection!: WatchedCollection<UserDoc>;
	roles!: Roles<AS>;
	sessions!: Sessions<AS>;
	orgs!: Orgs<AS>;
	avatars!: Avatars;
	
	byEmail = new Map();
	bySessionId = new Map();
	sorted: User<AS>[] = [];
	
	isSortRequired = true;
	
	#isPreinited = false;
	
	async preinit() {
		
		if (!this.#isPreinited) {
			this.#isPreinited = true;
			
			const {
				indexes: customIndexes,
				schema: customSchema,
				initialRoot: initialRootProps,
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
				required: [ ...basisSchema.required as string [], ...customSchema?.required as string[] ?? [] ],
				properties: { ...basisSchema.properties, ...customSchema?.properties }
			};
			
			this.collection = await this.collections.ensure<UserDoc>("users", { ...collectionOptions, schema });
			
			await this.collection.ensureIndexes([ ...indexes, ...customIndexes ?? [] ]);
			
			if (!await this.collection.countDocuments({ roles: "root" }))
				await this.create({
					email: process.env.INSITE_ROOT_EMAIL ?? "insite@root.email",
					password: process.env.INSITE_ROOT_PASSWORD ?? "inSiteRootPassword",
					name: { first: "Root" },
					job: "Root",
					...initialRootProps,
					roles: [ "root" ],
					org: null,
					meta: {}
				});
			
			await this.#maintain();
			
			for await (const userDoc of this.collection.find())
				this.load(userDoc);
		}
		
	}
	
	async #maintain() {
		
		await this.collection.updateMany({ meta: { $exists: false } }, { $set: { meta: {} } });
		
	}
	
	isInited = false;
	
	protected async init() {
		
		if (!this.isInited) {
			const {
				roles: rolesOptions,
				orgs: orgsOptions,
				sessions: sessionsOptions,
				avatars: avatarsOptions,
				collection: { quiet } = {}
			} = this.initOptions!;
			
			this.roles = new Roles<AS>(this, { ...rolesOptions, collection: { quiet, ...rolesOptions?.collection } });
			this.orgs = new Orgs<AS>(this, { ...orgsOptions, collection: { quiet, ...orgsOptions?.collection } });
			this.sessions = new Sessions<AS>(this, { ...sessionsOptions, collection: { quiet, ...sessionsOptions?.collection } });
			this.avatars = new Avatars(this, { ...avatarsOptions, collection: { quiet, ...avatarsOptions?.collection } });
			
			await this.roles.init();
			await this.orgs.preinit();
			await this.preinit();
			this.orgs.init();
			await this.avatars.init();
			
			this.update(true);
			
			this.collection.onChange(this.#handleCollectionChange);
			
			await this.sessions.init();
			
			delete this.initOptions;
			
			this.isInited = true;
			
			this.#initPromise.resolve(this);
		}
		
	}
	
	#handleCollectionChange = (next: ChangeStreamDocument<UserDoc>) => {
		switch (next.operationType) {
			case "insert":
				new User<AS>(this, next.fullDocument);
				break;
			
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
	
	
	load(userDoc: UserDoc) {
		new User<AS>(this, userDoc);
		
	}
	
	sort() {
		
		this.isSortRequired = false;
		
		this.sorted = [ ...this.values() ].sort((a, b) => a.name.last > b.name.last ? 1 : a.name.last < b.name.last ? -1 : 0);
		
	}
	
	update(shouldUpdateRoles?: boolean) {
		if (shouldUpdateRoles)
			for (const user of this.values())
				user.updateRoles();
		
		for (const user of this.values())
			user.updatePermissions();
		
		if (this.isSortRequired)
			this.sort();
		
	}
	
	#initPromise = new StatefulPromise<this>();
	
	whenReady() {
		return this.#initPromise;
	}
	
	async create({ email, password, roles, name, org, job, ...restProps }: NewUser) {
		if (this.byEmail.has(email))
			throw new Error("User exists");
		
		const _id = newObjectIdString();
		
		await this.collection.insertOne({
			_id,
			email,
			password: await hash(password),
			roles: this.isInited ? this.roles.cleanUpIds(roles) : roles,
			name: {
				first: name.first ?? "",
				middle: name.middle ?? "",
				last: name.last ?? ""
			},
			org: org ?? null,
			job: job ?? "",
			meta: {},
			...deleteProps(restProps, [ "_id" ]),
			createdAt: Date.now()
		});
		
		return _id;
	}
	
	async updateUser(_id: string, updates: Omit<UserDoc, "_id" | "createdAt">, byUser?: User<AS>) {
		const user = this.get(_id)!;
		
		if (!user)
			return false;
		
		if (updates.roles)
			updates.roles =
				user.isRoot ?
					[ "root" ] :
					this.roles.cleanUpIds(
						byUser ?
							without(user.ownRoleIds, byUser.slaveRoleIds).concat(updates.roles) :
							updates.roles
					);
		
		await this.collection.updateOne({ _id }, { $set: updates });
		
		return true;
	}
	
	async changePassword(_id: string, newPassword: string) {
		if (!this.has(_id))
			throw new Error("usernotfound");
		
		if (!newPassword)
			throw new Error("emptypasswordisnotallowed");
		
		await Promise.all([
			this.collection.updateOne({ _id }, { $set: { password: await hash(newPassword) } }),
			this.sessions.collection.deleteMany({ user: _id })
		]);
		
	}
	
	async login(email: string, password: string, sessionProps: Partial<SessionDoc>) {
		const user = this.byEmail.get(email);
		
		if (!user)
			throw new Error("usernotfound");
		
		if (!await verify(user.password, password))
			throw new Error("incorrectpassword");
		
		if (!user.abilities.login)
			throw new Error("userisnotabletologin");
		
		return this.sessions.create(user, sessionProps);
	}
	
	logout(session: Session<AS>) {
		session.delete();
		
		return this.sessions.collection.deleteOne({ _id: session._id });
	}
	
	#sortUsersAndOrgs(a: Org<AS> | User<AS>, b: Org<AS> | User<AS>) {
		return (
			(a instanceof User && b instanceof User) ?
				(a.name.last && b.name.last) ?
					a.name.last > b.name.last ?
						1 :
						a.name.last < b.name.last ? -1 : 0 :
					(!a.name.last && !b.name.last) ?
						a.displayLabel > b.displayLabel ?
							1 :
							a.displayLabel < b.displayLabel ? -1 : 0 :
						a.name.last ? -1 : 1 :
				(a instanceof Org && b instanceof Org) ?
					a.title > b.title ?
						1 :
						a.title < b.title ? -1 : 0 :
					a instanceof Org ? -1 : 1
		);
	}
	
	sortIds(ids: string[]) {
		return _ids((
			ids
				.map(_id => this.get(_id) || this.orgs.get(_id))
				.filter(Boolean) as (Org<AS> | User<AS>)[]
		).sort(this.#sortUsersAndOrgs));
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
	
	async deleteUser(_id: string) {
		const { deletedCount } = await this.collection.deleteOne({ _id });
		
		return Boolean(deletedCount);
	}
	
	
	static init<IAS extends AbilitiesSchema>(collections: Collections, options: Options<IAS>) {
		const users = new Users(collections, options);
		
		return users.whenReady();
	}
	
}
