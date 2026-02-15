import type { SubscriptionHandle } from "./SubscriptionHandle";
import type { PublicationProps, SubscriptionArgs } from "./types";


declare global {
	var __insite_publications: Map<string, Publication>;// eslint-disable-line @typescript-eslint/naming-convention, camelcase
}

export const publications =
	globalThis.__insite_publications ??=// eslint-disable-line camelcase
		new Map();

export class Publication<SA extends SubscriptionArgs = SubscriptionArgs> {
	constructor(name: string, props?: PublicationProps<SA>) {
		this.name = name;
		
		if (props)
			Object.assign(this, props);
		
		publications.set(name, this as Publication);
		
	}
	
	readonly name;
	onSubscribe?: PublicationProps<SA>["onSubscribe"];
	onUnsubscribe?: PublicationProps<SA>["onUnsubscribe"];
	
	type = "object";
	
	subscriptions = new Set<SubscriptionHandle<SA>>();
	
	fetch?(...args: SA): unknown;
	
	fetchSubscription(subscription: SubscriptionHandle<SA>, _reason?: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
		return this.fetch?.(...subscription.args);
	}
	
	subscribe(subscription: SubscriptionHandle<SA>) {
		this.subscriptions.add(subscription);
		this.onSubscribe?.(subscription);
		
	}
	
	changed(reason?: unknown) {
		for (const subscription of this.subscriptions)
			void subscription.changed(reason);
		
	}
	
	unsubscribe(subscription: SubscriptionHandle<SA>) {
		this.onUnsubscribe?.(subscription);
		this.subscriptions.delete(subscription);
		
	}
	
	
	static publications = publications;
	
}
