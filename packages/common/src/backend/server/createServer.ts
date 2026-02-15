import http from "node:http";
import https from "node:https";


export function createServer(options: http.ServerOptions): http.Server;
export function createServer(options: https.ServerOptions): https.Server;
export function createServer(options: http.ServerOptions, port: number | string): Promise<http.Server>;
export function createServer(options: https.ServerOptions, port: number | string): Promise<https.Server>;
export function createServer(options: http.ServerOptions | https.ServerOptions, port?: number | string) {
	
	const server =
		("key" in options && "cert" in options) ?
			https.createServer(options) :
			http.createServer(options);
	
	return port ?
		new Promise(resolve => {
			server.on("listening", () => resolve(server));
			server.listen(port);
			
		}) :
		server;
}
