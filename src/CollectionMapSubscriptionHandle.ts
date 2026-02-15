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
		if (skippedChangeStreamDocuments.has(next) || !("documentKey" in next))
			return;
		
		if (this.ids.has(next.documentKey._id as unknown as string)) {
			if (next.operationType === "update" && this.fields) {
				const { fields } = this;
				
				let isRelevantUpdate = false;
				
				const { updatedFields } = next.updateDescription;
				
				if (updatedFields)
					for (const updatedField in updatedFields) { // eslint-disable-line guard-for-in
						if (fields.has(updatedField)) {
							isRelevantUpdate = true;
							break;
						}
						
						const dotIndex = updatedField.indexOf(".");
						
						if (dotIndex !== -1 && fields.has(updatedField.slice(0, dotIndex))) {
							isRelevantUpdate = true;
							break;
						}
					}
				
				const { removedFields } = next.updateDescription;
				
				if (!isRelevantUpdate && removedFields?.length)
					for (const removedField of removedFields) {
						if (fields.has(removedField)) {
							isRelevantUpdate = true;
							break;
						}
						
						const dotIndex = removedField.indexOf(".");
						
						if (dotIndex !== -1 && fields.has(removedField.slice(0, dotIndex))) {
							isRelevantUpdate = true;
							break;
						}
					}
				
				if (!isRelevantUpdate)
					return;
			}
		} else if (!("fullDocument" in next) || !this.match!(next.fullDocument!))
			return;
		
		clearTimeout(this.#flushTimeout);
		
		this.updates.push(await this.publication.fetchSubscription(this, next));
		
		this.#flushTimeout = setTimeout(this.flushUpdates, 1);
		
	};
	
}
