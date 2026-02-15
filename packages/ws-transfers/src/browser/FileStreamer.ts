import type { ArrayBufferWithLength, StreamerOptions } from "../types";


type Listener = {
	(arrayBuffer: ArrayBufferWithLength): Promise<void> | void;
};


export class FileStreamer {
	constructor(file: File, options: StreamerOptions = {}) {
		this.file = file;
		this.size = this.file.size;
		
		const {
			chunkSize = 1024 * 256
		} = options;
		
		this.chunkSize = chunkSize;
		
		this.fileReader = new FileReader();
		
		// eslint-disable-next-line unicorn/prefer-add-event-listener
		this.fileReader.onload = this.#handleFileReaderLoad;
		
	}
	
	file;
	size;
	chunkSize;
	fileReader;
	listener?: Listener;
	
	#start = 0;
	#end = 0;
	
	isAborted = false;
	
	start(listener: Listener) {
		this.listener = listener;
		
		this.#next();
		
	}
	
	#next() {
		
		if (!this.isAborted) {
			this.#end = Math.min(this.#start + this.chunkSize, this.size);
			
			// eslint-disable-next-line unicorn/prefer-blob-reading-methods
			this.fileReader.readAsArrayBuffer(this.file.slice(this.#start, this.#end));
		}
		
	}
	
	#handleFileReaderLoad = async () => {
		
		if (!this.isAborted) {
			const arrayBuffer = this.fileReader.result as ArrayBufferWithLength;
			arrayBuffer.length = arrayBuffer.byteLength;
			
			await this.listener!(arrayBuffer);
			
			if (this.#end < this.size) {
				this.#start = this.#end;
				
				this.#next();
			}
		}
		
	};
	
	abort() {
		
		this.isAborted = true;
		
	}
	
}
