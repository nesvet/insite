import { Publication, publications } from "./Publication";
import type { SubscriptionArgs, SubscriptionHandler } from "./types";


export class SubscriptionHandle<SA extends SubscriptionArgs> {
	constructor(
		publicationName: string,
		args: SA,
		handler: SubscriptionHandler,
		immediately?: boolean,
		prevent?: boolean
	) {
		
		const publication = publications.get(publicationName);
		
		if (publication) {
			this.publication = publication as Publication<SA>;
			this.args = args;
			this.handler = handler;
			
			if (!prevent) {
				this.publication.subscribe(this);
				
				if (immediately)
					void this.changed(null);
			}
			
		} else if (process.env.NODE_ENV === "development")
			console.error("Unknown publication", publicationName);
		
	}
	
	publication!: Publication<SA>;
	args!: SA;
	handler!: SubscriptionHandler;
	
	async changed(reason?: unknown) {
		this.handler(await this.publication.fetchSubscription(this, reason), reason);
		
	}
	
	cancel() {
		
		this.publication?.unsubscribe(this);
		
	}
	
	renew() {
		
		this.publication?.unsubscribe(this);
		
		this.publication?.subscribe(this);
		
		return this.changed(null);
	}
	
}
