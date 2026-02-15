import type { AbilitiesSchema } from "insite-common";
import type { User } from "../users/User";
import type { Sessions } from "./Sessions";
import type { SessionDoc } from "./types";


export class Session<AS extends AbilitiesSchema> {
	constructor(sessions: Sessions<AS>, sessionDoc: SessionDoc) {
		const user = sessions.users.get(sessionDoc.user);
		
		if (user) {
			this.#sessions = sessions;
			
			this._id = sessionDoc._id;
			this.#sessions.set(this._id, this);
			
			this.user = user;
			this.user.sessions.add(this);
			
			this.#sessions.users.bySessionId.set(this._id, this.user);
			
			this.update(sessionDoc);
		} else
			void sessions.collection.deleteOne({ _id: sessionDoc._id });
		
	}
	
	_id!: string;
	user!: User<AS>;
	isOnline = false;
	
	userAgent!: string;
	remoteAddress!: string;
	createdAt!: number;
	prolongedAt!: number;
	expiresAt!: Date;
	
	#sessions!: Sessions<AS>;
	
	update({ _id, user, isOnline, ...restProps }: Partial<SessionDoc>) {
		
		if (isOnline !== undefined && this.isOnline !== isOnline) {
			this.isOnline = isOnline;
			
			if (this.#sessions.users.isInited && this.user.isOnline !== this.isOnline)
				void this.user.updateIsOnlineDebounced();
		}
		
		Object.assign(this, restProps);
		
	}
	
	prolong({ _id, user, ...updates }: Partial<SessionDoc>) {
		
		const ts = Date.now();
		
		updates.prolongedAt = ts;
		updates.expiresAt = new Date(ts + (this.#sessions.collection.expireAfterSeconds * 1000));
		
		this.update(updates);
		
		return this.#sessions.collection.updateOne({ _id: this._id }, { $set: updates });
	}
	
	async online() {
		
		if (!this.isOnline) {
			const updates = { isOnline: true };
			
			this.update(updates);
			
			await this.#sessions.collection.updateOne({ _id: this._id }, { $set: updates });
		}
		
	}
	
	async offline() {
		
		if (this.isOnline) {
			const updates = { isOnline: false };
			
			this.update(updates);
			
			await this.#sessions.collection.updateOne({ _id: this._id }, { $set: updates });
		}
		
	}
	
	delete() {
		
		this.#sessions.delete(this._id);
		this.user.sessions.delete(this);
		this.#sessions.users.bySessionId.delete(this._id);
		
		this.#sessions.users.emit("session-delete", this);
		
		if (this.isOnline)
			this.user.updateIsOnline();
		
	}
	
}
