import { Binary, type WatchedCollection } from "insite-db";
import type { Users } from "../Users";
import { schema } from "./schema";
import type { AvatarDoc, AvatarsOptions } from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any */


export class Avatars {
	constructor(users: Users<any>, options: AvatarsOptions = {}) {
		this.#users = users;
		this.collections = users.collections;
		
		this.initOptions = options;
		
	}
	
	readonly TYPES_ACCEPTED = [ "image/webp" ];
	readonly MAX_SIZE = 1024 * 512;
	
	#users;
	collections;
	
	collection!: WatchedCollection<AvatarDoc>;
	
	private initOptions?;
	
	async init() {
		
		if (!this.#users.isInited) {
			const {
				collection: collectionOptions
			} = this.initOptions!;
			
			this.collection = await this.collections.ensure<AvatarDoc>("users.avatars", { ...collectionOptions, schema });
			
			await this.#maintain();
		}
		
	}
	
	async #maintain() {
		
		await this.collection.updateMany({ meta: { $exists: false } }, { $set: { meta: {} } });
		
	}
	
	async save(_id: string, type: string, data: string) {
		const binaryData = Binary.createFromBase64(data.slice(data.indexOf(",")));
		
		const ts = Date.now().toString(36);
		
		await Promise.all([
			this.collection.replaceOne({ _id }, {
				type,
				size: binaryData.length(),
				ts,
				data: binaryData,
				meta: {}
			}, { upsert: true }),
			this.#users.collection.updateOne({ _id }, { $set: { avatar: ts } })
		]);
		
	}
	
	async deleteAvatar(_id: string) {
		
		const [ { deletedCount } ] = await Promise.all([
			this.collection.deleteOne({ _id }),
			this.#users.collection.updateOne({ _id }, { $set: { avatar: null } })
		]);
		
		return Boolean(deletedCount);
	}
	
}
