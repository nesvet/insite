import {
	ChangeStreamDocument,
	Document,
	Filter,
	Sort
} from "insite-db";
import { skippedChangeStreamDocuments } from "./CollectionMapPublication";
import { SubscriptionHandle } from "./SubscriptionHandle";
import type { Projection, SubscriptionArgs } from "./types";


export class CollectionMapSubscriptionHandle<
	D extends Document = Document,
	SA extends SubscriptionArgs = SubscriptionArgs
> extends SubscriptionHandle<SA> {
	constructor(
		publicationName: string,
		args: SA,
		handler: (fetched: unknown) => void,
		immediately?: boolean
	) {
		super(publicationName, args, handler, immediately, true);
		
		if (this.publication) {
			this.publication.subscribe(this);
			
			if (immediately)
				void this.changed(null);
		}
		
	}
	
	ids = new Set<string>();
	
	query: Filter<D> | null = null;
	projection: Projection | null = null;
	isProjectionInclusive = false;
	fields: Set<string> | null = null;
	sort: Sort | null = null;
	
	match?: (doc: D) => boolean;
	
	async changed(next: ChangeStreamDocument<D> | null) {
		this.handler([ await this.publication.fetchSubscription(this, next) ]);
		
	}
	
	updates: unknown[] = [];
	#flushTimeout?: ReturnType<typeof setTimeout>;
	
	flushUpdates = () => {
		
		if (this.updates.length) {
			this.handler(this.updates);
			this.updates = [];
		}
		
	};
	
	collectionChangeListener = async (next: ChangeStreamDocument<D>) => {
		
		if (
			!skippedChangeStreamDocuments.has(next) &&
			"documentKey" in next &&
			(this.ids.has(next.documentKey._id as unknown as string) ? (
				next.operationType !== "update" ||
				!this.fields ||
				(
					next.updateDescription.updatedFields &&
					Object.keys(next.updateDescription.updatedFields).some(field => this.fields!.has(field))
				)
			) : (
				"fullDocument" in next &&
				this.match!(next.fullDocument!)
			))
		) {
			clearTimeout(this.#flushTimeout);
			
			this.updates.push(await this.publication.fetchSubscription(this, next));
			
			this.#flushTimeout = setTimeout(this.flushUpdates, 1);
		}
		
	};
	
	
}
