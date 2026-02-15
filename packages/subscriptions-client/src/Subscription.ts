import type { WS } from "insite-ws/client";


/* eslint-disable @typescript-eslint/no-explicit-any */


declare global {
	var __initials: unknown[] | undefined;
}


let i: number;
let subscriptions: Map<number, Subscription>;
let ws: WS;


export class Subscription {
	constructor(type: "array" | "map" | "object", publicationName: string, args: unknown[] = [], handler: (updates: any) => void, immediately = true) {
		
		if (!ws)
			throw new Error("Subscription is not binded to WS. Do Subscription.bindTo(ws) first");
		
		this.i = i++;
		this.type = type;
		this.publicationName = publicationName;
		this.args = args;
		this.handler = handler;
		this.immediately = immediately && !globalThis.__initials;
		
		subscriptions.set(this.i, this);
		
		ws.on("open", this.start);
		
		if (ws.isOpen)
			this.start();
		
		if (globalThis.__initials) {
			this.isActive = true;
			this.handler(globalThis.__initials.splice(0, 1)[0]);
		} else
			this.isActive = false;
		
	}
	
	i;
	type;
	publicationName;
	args;
	handler;
	immediately;
	isActive;
	
	start = () => {
		
		ws.sendMessage("s-s"/* subscription subscribe */, this.type, this.publicationName, this.i, this.args, this.immediately);
		
		this.immediately = true;
		
	};
	
	cancel() {
		
		subscriptions.delete(this.i);
		
		ws.off("open", this.start);
		
		ws.sendMessage("s-u"/* subscription unsubscribe */, this.i);
		
	}
	
	
	static bindTo(_ws: WS) {
		ws = _ws;
		
		i = 0;
		
		subscriptions = new Map();
		
		ws.on("message:s-c"/* subscription changed */, (si: number, updates: any) => {
			const subscription = subscriptions.get(si);
			if (subscription) {
				subscription.isActive = true;
				subscription.handler(updates);
			}
			
		});
		
		ws.on("close", () => {
			
			for (const subscription of subscriptions.values())
				subscription.isActive = false;
			
		});
		
		ws.on("server-change", () => {
			
			for (const subscription of subscriptions.values())
				subscription.handler(null);
			
		});
		
	}
	
}
