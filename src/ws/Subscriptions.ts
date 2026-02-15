import type { AbilitiesSchema } from "insite-common";
import type { Document } from "insite-db";
import type { CollectionMapSubscriptionHandle } from "./CollectionMapSubscriptionHandle";
import type { SubscriptionHandle } from "./SubscriptionHandle";


/* eslint-disable @typescript-eslint/no-explicit-any */


export class Subscriptions<AS extends AbilitiesSchema> extends Map<number | string, CollectionMapSubscriptionHandle<AS, Document, any[], any, any> | SubscriptionHandle<AS, any[], any, any>> {
	
	subscribe = this.set;
	
	renew() {
		return Promise.all([ ...this.values() ].map(subscription => subscription.renew()));
	}
	
	cancel(key: number | string) {
		this.get(key)?.cancel();
		this.delete(key);
		
	}
	
}
