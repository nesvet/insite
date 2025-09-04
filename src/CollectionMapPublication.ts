import sift from "sift";
import type {
	ChangeStreamDocument,
	Document,
	Filter,
	Sort,
	WatchedCollection
} from "insite-db";
import { CollectionMapSubscriptionHandle } from "./CollectionMapSubscriptionHandle";
import { Publication } from "./Publication";
import { SubscriptionHandle } from "./SubscriptionHandle";
import type {
	PartialWithId,
	Projection,
	SubscriptionArgs,
	TransformableDoc
} from "./types";


function projectDocument<D extends Document>(document: D, projection: null, isInclusive?: boolean, isTop?: boolean): D;
function projectDocument<D extends Document>(document: D, projection: Projection, isInclusive?: boolean, isTop?: boolean): Partial<D>;
function projectDocument<D extends Document>(document: D, projection: Projection | null, isInclusive?: boolean, isTop?: boolean): D | Partial<D>;
function projectDocument<D extends Document>(document: D, projection: Projection | null, isInclusive = true, isTop = true) {
	if (projection)
		if (isInclusive) {
			const projected: Record<string, unknown> = {};
			
			for (const key in projection) { // eslint-disable-line guard-for-in
				const subprojection = projection[key];
				const subdocument = document[key];
				
				projected[key] =
					subdocument &&
					(typeof subprojection == "object" && typeof subdocument == "object") ?
						Array.isArray(subdocument) ?
							subdocument.map((item: Document) => projectDocument(item, subprojection, true, false)) :
							projectDocument(subdocument, subprojection, true, false) :
						subdocument;
			}
			
			if (isTop && projection._id === 0)
				delete projected._id;
			
			return projected as Partial<D>;
		} else {
			const projected = { ...document } as Record<string, unknown>;
			for (const key in projection) { // eslint-disable-line guard-for-in
				const subprojection = projection[key];
				if (typeof subprojection == "object")
					projected[key] =
						Array.isArray(document[key]) ?
							document[key].map((item: Document) => projectDocument(item, subprojection, false, false)) :
							projectDocument(document[key], subprojection, false, false);
				else
					delete projected[key];
			}
			
			return projected as Partial<D>;
		}
	
	return document;
}

export const skippedChangeStreamDocuments = new WeakSet<ChangeStreamDocument>();

type QueryProps<D extends Document> = {
	query?: Filter<D>;
	projection?: Projection;
	sort?: Sort;
	triggers?: string[];
};


export class CollectionMapPublication<
	D extends Document = Document,
	SA extends SubscriptionArgs = SubscriptionArgs
> extends Publication<SA> {
	constructor(
		collection: WatchedCollection<D>,
		name: string,
		queryProps?: ((...args: SA) => QueryProps<D> | false | null | void) | QueryProps<D> | false | null,
		transform?: (doc: TransformableDoc<D>, args: SA) => void
	) {
		super(name);
		
		this.collection = collection;
		this.queryProps = queryProps;
		this.transform = transform;
		
	}
	
	type = "map";
	
	collection;
	declare subscriptions: Set<CollectionMapSubscriptionHandle<D, SA>>;
	queryProps;
	transform;
	
	skip(next: ChangeStreamDocument<D>) {
		skippedChangeStreamDocuments.add(next);
		
	}
	
	makeQueryProps(args: SA) {
		const {
			query = null,
			projection = null,
			sort = null,
			triggers
		} = (typeof this.queryProps == "function" ? this.queryProps(...args) : this.queryProps) || {};
		
		let isProjectionInclusive = false;
		let fields = null;
		if (projection) {
			// eslint-disable-next-line guard-for-in
			for (const key in projection) {
				isProjectionInclusive = !!projection[key];
				if (key !== "_id")
					break;
			}
			if (isProjectionInclusive) {
				fields = new Set([ ...Object.keys(query ?? {}), ...Object.keys(projection), ...triggers ?? [] ]);
				fields.delete("_id");
				if (projection._id !== 0)
					projection._id = 1;
			}
		}
		
		return { query, projection, isProjectionInclusive, fields, sort, args };
	}
	
	async fetchSubscription(subscription: SubscriptionHandle<SA>, next: ChangeStreamDocument<D> | null) {
		if (subscription instanceof CollectionMapSubscriptionHandle && subscription.query) {
			if (next && "documentKey" in next) {
				const _id = next.documentKey._id as unknown as string;
				
				if (next.operationType === "insert" || (next.operationType !== "delete" && subscription.match!(next.fullDocument!))) {
					const doc = projectDocument(next.fullDocument!, subscription.projection, subscription.isProjectionInclusive);
					this.transform?.(doc as TransformableDoc<D>, subscription.args);
					if (subscription.ids.has(_id))
						return [ "u"/* update */, doc, "updateDescription" in next && next.updateDescription.updatedFields && Object.keys(next.updateDescription.updatedFields) ];
					
					subscription.ids.add(_id);
					
					return [ "c"/* create */, doc ];
					
				}
				subscription.ids.delete(_id);
				
				return [ "d"/* delete */, _id ];
				
			}
			const cursor = this.collection.find(subscription.query);
			
			if (subscription.projection)
				cursor.project(subscription.projection);
			
			if (subscription.sort)
				cursor.sort(subscription.sort);
			
			const array = await cursor.toArray() as unknown as PartialWithId<D>[];
			
			if (subscription.ids) {
				subscription.ids.clear();
				if (this.transform)
					for (const item of array) {
						subscription.ids.add(item._id);
						this.transform(item, subscription.args);
					}
				else
					for (const item of array)
						subscription.ids.add(item._id);
			} else if (this.transform)
				for (const item of array)
					this.transform(item, subscription.args);
			
			return [ "i"/* initial */, array, subscription.sort ];
		}
		
		return null;
	}
	
	changed(reason: ChangeStreamDocument<D> | null) {
		return Promise.all([ ...this.subscriptions ].map(subscription => subscription.changed(reason)));
	}
	
	onSubscribe = (subscription: SubscriptionHandle<SA>) => {
		if (subscription instanceof CollectionMapSubscriptionHandle) {
			Object.assign(subscription, this.makeQueryProps(subscription.args));
			
			if (subscription.query) {
				subscription.match = sift(subscription.query);
				this.collection.onChange(subscription.collectionChangeListener);
			}
		}
		
	};
	
	flushInitial() {
		return Promise.all([ ...this.subscriptions ].map(async subscription => {
			const fetched = await this.fetchSubscription(subscription, null);
			subscription.handler([ fetched ]);
			subscription.updates = [];
			
		}));
	}
	
	onUnsubscribe = (subscription: SubscriptionHandle<SA>) => {
		if (subscription instanceof CollectionMapSubscriptionHandle && subscription.query)
			this.collection.removeChangeListener(subscription.collectionChangeListener);
		
	};
	
}
