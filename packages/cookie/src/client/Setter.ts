import type { WS } from "insite-ws/client";
import { headers, type Method } from "../common";


/* eslint-disable unicorn/prefer-add-event-listener */


export type Options = {
	method?: Method;
	url?: string;
	onload?: (this: XMLHttpRequest, event: ProgressEvent) => unknown;
	onerror?: (this: XMLHttpRequest, event: ProgressEvent) => unknown;
};


export class CookieSetter {
	constructor(ws: WS, options: Options = {}) {
		
		const {
			method = "GET",
			url = "/cookie",
			onload = CookieSetter.onXhrLoad,
			onerror = CookieSetter.onXhrError
		} = options;
		
		this.method = method;
		this.url = url;
		this.#onload = onload;
		this.#onerror = onerror;
		
		ws.on(`message:${headers.set}`, this.#handleSet);
		
	}
	
	readonly method;
	readonly url;
	#onload;
	#onerror;
	
	#handleSet = (token: string) => {
		
		const xhr = new XMLHttpRequest();
		
		xhr.onload = this.#onload;
		xhr.onerror = this.#onerror;
		
		xhr.open(this.method, `${this.url}?${token}`, true);
		
		xhr.send(null);
		
	};
	
	
	static onXhrLoad(this: XMLHttpRequest) {
		
		if (this.readyState === 4 && this.status !== 200)
			console.error("Set cookie:", this.statusText);
		
	}
	
	static onXhrError(this: XMLHttpRequest) {
		
		console.error("Set cookie:", this.statusText);
		
	}
	
}
