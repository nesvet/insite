import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { brotliPreloadSync, getCompressionStreamByEncoding, gzipPreloadSync } from "../../compression";
import { ClassMiddleware } from "../../Middleware";
import type { Handler } from "../../types";
import { defaultExtensions } from "./extensions";
import { defaultPreloaded } from "./preloaded";
import type { Extension, Options } from "./types";


const { INSITE_STATIC_ROOT = "" } = process.env;

const nullExtension = {
	mimeType: "application/octet-stream"
};


export class StaticMiddleware extends ClassMiddleware {
	constructor({
		src = "public",
		root = INSITE_STATIC_ROOT,
		path: _path,
		extensions = defaultExtensions,
		resolved,
		restricted,
		preloaded = "default"
	}: Options = {}) {
		super();
		
		if (!path.isAbsolute(src)) {
			const [ , entryPoint ] = process.argv;
			src = path.resolve(fs.statSync(entryPoint).isDirectory() ? entryPoint : path.dirname(entryPoint), src);
		}
		
		this.#src = src;
		this.#rootRegExp = new RegExp(`^${path.join("/", root, "/")}`);
		
		if (extensions)
			for (const extension of extensions)
				if (extension)
					this.#addExtension(...extension);
		
		if (resolved)
			for (const resolvee of resolved)
				if (resolvee)
					this.#resolve(...resolvee);
		
		if (restricted)
			for (const fileName of restricted)
				if (fileName)
					this.#restrict(fileName);
		
		if (preloaded) {
			if (preloaded === "default")
				preloaded = defaultPreloaded;
			
			for (const fileName of preloaded)
				if (fileName)
					this.#preload(fileName);
		}
		
		this.listeners = {
			GET: [ [ _path ?? new RegExp(String.raw`^${path.join("/", root, "/")}(\w[^\/]*/)*[^\/]+\.[^\/]`), this.#handler ] ]
		};
		
	}
	
	priority = -900;
	
	#src;
	#rootRegExp;
	
	#extensions = new Map();
	
	#resolved = new Map();
	
	#restricted = new Set();
	
	#preloaded = new Map();
	
	#getExtensionBy(fileName: string) {
		return this.#extensions.get(fileName.slice(Math.max(0, fileName.lastIndexOf(".") + 1))) ?? nullExtension;
	}
	
	#addExtension(name: string, extension: Extension[1]) {
		this.#extensions.set(name, { ...extension, name });
		
	}
	
	#resolve(url: string, fileName: string) {
		this.#resolved.set(url, path.isAbsolute(fileName) ? fileName : path.join(this.#src, fileName));
		
	}
	
	#restrict(fileName: string) {
		this.#restricted.add(path.join(this.#src, fileName));
		
	}
	
	#preload(fileName: string) {
		fileName = this.#resolved.get(fileName) ?? path.join(this.#src, fileName);
		
		try {
			const { isText } = this.#getExtensionBy(fileName);
			const fileData = fs.readFileSync(fileName, isText ? "utf8" : null);
			this.#preloaded.set(fileName, isText ? {
				br: brotliPreloadSync(fileData),
				gzip: gzipPreloadSync(fileData)
			} : fileData);
		} catch (error) {
			console.warn(`⚠️  inSite Static Server: Unable to preload ${fileName}`, "\n", error);
		}
		
	}
	
	#handler: Handler = (request, response) => {
		
		let relativeKey;
		
		try {
			relativeKey = decodeURI(request.path).replace(this.#rootRegExp, "");
		} catch {
			return response.notFound();
		}
		
		const resolvedFileName = this.#resolved.get(relativeKey);
		let fileName;
		
		if (resolvedFileName)
			fileName = resolvedFileName;
		else {
			fileName = path.resolve(this.#src, path.normalize(relativeKey));
			const srcPrefix = this.#src.endsWith(path.sep) ? this.#src : `${this.#src}${path.sep}`;
			
			if (fileName !== this.#src && !fileName.startsWith(srcPrefix))
				return response.notFound();
		}
		
		if (this.#restricted.has(fileName))
			return response.notFound();
		
		if (!fs.existsSync(fileName))
			return response.notFound();
		
		const { mimeType, isText } = this.#getExtensionBy(fileName);
		const contentEncoding = isText ? /\bbr\b/.test(request.headers["accept-encoding"] as string) ? "br" : "gzip" : null;
		
		response.writeHead(200, {
			"Content-Type": mimeType + (isText ? "; charset=utf-8" : ""),
			...contentEncoding && { "Content-Encoding": contentEncoding }
		});
		
		const preloaded = this.#preloaded.get(fileName);
		
		if (preloaded)
			return response.end(isText && contentEncoding ? preloaded[contentEncoding] : preloaded);
		
		return new Promise<boolean | void>(resolve => {
			let settled = false;
			const fail = () => {
				if (settled)
					return;
				
				settled = true;
				response.destroy();
				resolve(false);
			};
			const fileStream = fs.createReadStream(fileName).on("error", fail);
			let stream: Readable = fileStream;
			
			if (contentEncoding)
				stream = fileStream.pipe(getCompressionStreamByEncoding(contentEncoding)).on("error", fail);
			
			stream.on("end", () => {
				if (!settled)
					resolve();
			});
			
			stream.pipe(response);
			
		});
	};
	
}
