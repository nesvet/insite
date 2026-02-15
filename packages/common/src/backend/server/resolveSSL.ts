import { readFileSync } from "node:fs";


export function resolveSSL(ssl: {
	cert: Buffer<ArrayBufferLike> | string;
	key: Buffer<ArrayBufferLike> | string;
} = {
	cert: process.env.INSITE_SSL_CERT!,
	key: process.env.INSITE_SSL_KEY!
}) {
	if (ssl.cert && ssl.key)
		try {
			if (typeof ssl.cert == "string" && !/^-{3,}BEGIN/.test(ssl.cert))
				ssl.cert = readFileSync(ssl.cert);
			
			if (typeof ssl.key == "string" && !/^-{3,}BEGIN/.test(ssl.key))
				ssl.key = readFileSync(ssl.key);
			
			return ssl;
		} catch (error) {
			console.error("SSL resolve error:", error);
		}
	
	return undefined;// eslint-disable-line unicorn/no-useless-undefined
}

