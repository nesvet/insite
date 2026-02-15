import type { AbilitiesSchema } from "insite-common";
import type { Document } from "insite-db";
import type { Session, User } from "insite-users-server";
import type { WSSCWithUser, WSServer } from "insite-ws/server";
import { publications } from "../Publication";
import { CollectionMapPublication } from "./CollectionMapPublication";
import { CollectionMapSubscriptionHandle } from "./CollectionMapSubscriptionHandle";
import { Publication } from "./Publication";
import { SubscriptionHandle } from "./SubscriptionHandle";
import { Subscriptions } from "./Subscriptions";
import {
	isCollectionMapPublicationArgs,
	isPublicationCollectionMap,
	type CollectionMapPublicationArgs,
	type PublicationArgs,
	type WSSubscriptionArgs
} from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any */


const TYPES = [ "object", "map" ] as const;


export class SubscriptionHandler<AS extends AbilitiesSchema> {
	constructor(wss: WSServer, withCollections?: boolean) {
		
		wss.on("client-connect", this.#handleClientConnect);
		wss.on("client-session", this.#handleClientSession);
		wss.on("client-message:s-s"/* subscription subscribe */, this.#handleClientSubscribe);
		wss.on("client-message:s-u"/* subscription unsubscribe */, this.#handleClientUnsubscribe);
		wss.on("client-close", this.#handleClientClose);
		
		wss.on("should-renew-subscriptions", this.renewSubscriptionsFor);
		
		Object.assign(wss, withCollections ? {
			publish<RA extends any[], D extends Document>(...args: CollectionMapPublicationArgs<AS, D, RA, User<AS>, Session<AS>> | PublicationArgs<AS, RA, User<AS>, Session<AS>>) {
				return isCollectionMapPublicationArgs(args) ?
					new CollectionMapPublication<AS, D, RA, User<AS>, Session<AS>>(...args) :
					new Publication<AS, RA, User<AS>, Session<AS>>(...args);
			}
		} : {
			publish<RA extends any[]>(...args: PublicationArgs<AS, RA, User<AS>, Session<AS>>) {
				return new Publication<AS, RA, User<AS>, Session<AS>>(...args);
			}
		});
		
	}
	
	#wsSubscriptionMap = new WeakMap<WSSCWithUser<AS, User<AS>, Session<AS>>, Subscriptions<AS>>();
	
	renewSubscriptionsFor = (webSockets: WSSCWithUser<AS, User<AS>, Session<AS>>[]) => {
		for (const wssc of webSockets)
			void this.#wsSubscriptionMap.get(wssc)?.renew();
		
	};
	
	#handleClientConnect = (wssc: WSSCWithUser<AS, User<AS>, Session<AS>>) =>
		this.#wsSubscriptionMap.set(wssc, new Subscriptions());
	
	#handleClientSession = (wssc: WSSCWithUser<AS, User<AS>, Session<AS>>) =>
		this.#wsSubscriptionMap.get(wssc)?.renew();
	
	#handleClientSubscribe = (
		wssc: WSSCWithUser<AS, User<AS>, Session<AS>>,
		subscriptionType: typeof TYPES[number],
		publicationName: string,
		i: number | string,
		restArgs: any[],
		immediately?: boolean
	) => {
		
		if (TYPES.includes(subscriptionType)) {
			const publication = publications.get(publicationName) as CollectionMapPublication<AS, Document, any[], User<AS>, Session<AS>> | Publication<AS, any[], User<AS>, Session<AS>> | undefined;
			
			if (publication?.type === subscriptionType) {
				const subscriptionHandleArgs = [
					publicationName,
					[ wssc, ...restArgs ] as WSSubscriptionArgs<AS, any[], User<AS>, Session<AS>>,
					(data: unknown) => wssc.sendMessage("s-c"/* subscription changed */, i, data),
					immediately
				] as const;
				
				this.#wsSubscriptionMap
					.get(wssc)
					?.subscribe(i,
						isPublicationCollectionMap(publication) ?
							new CollectionMapSubscriptionHandle<AS, Document, any[], User<AS>, Session<AS>>(...subscriptionHandleArgs) :
							new SubscriptionHandle<AS, any[], User<AS>, Session<AS>>(...subscriptionHandleArgs)
					);
			}
		}
		
	};
	
	#handleClientUnsubscribe = (wssc: WSSCWithUser<AS, User<AS>, Session<AS>>, i: number | string) =>
		this.#wsSubscriptionMap.get(wssc)?.cancel(i);
	
	#handleClientClose = (wssc: WSSCWithUser<AS, User<AS>, Session<AS>>) => {
		for (const subscription of this.#wsSubscriptionMap.get(wssc)?.values() ?? [])
			subscription.cancel();
		
	};
	
}
