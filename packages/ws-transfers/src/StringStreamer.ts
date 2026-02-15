import type { StreamerOptions } from "./types";


/* eslint-disable @stylistic/max-statements-per-line */


type Listener = {
	(chunk: string): Promise<void> | void;
};


export class StringStreamer {
	constructor(string: string, options: StreamerOptions = {}) {
		this.string = string;
		this.size = this.string.length;
		
		const {
			chunkSize = 1024 * 256
		} = options;
		
		this.chunkSize = chunkSize;
		
	}
	
	string;
	size;
	chunkSize;
	listener?: Listener;
	
	#start = 0;
	#end = 0;
	
	isAborted = false;
	
	start(listener: Listener) {
		this.listener = listener;
		
		void this.#next();
		
	}
	
	async #next() {
		
		if (!this.isAborted) {
			this.#end = Math.min(this.#start + this.chunkSize, this.size);
			
			const chunk = await new Promise<string>(resolve => { resolve(this.string.slice(this.#start, this.#end)); });
			
			if (!this.isAborted) {
				await this.listener!(chunk);
				
				if (this.#end < this.size) {
					this.#start = this.#end;
					
					void this.#next();
				}
			}
		}
		
	}
	
	abort() {
		
		this.isAborted = true;
		
	}
	
}
