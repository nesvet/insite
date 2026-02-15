import type http from "node:http";
import type https from "node:https";
import type { AddressInfo } from "node:net";


type Server = {
	icon: string;
	name: string;
	protocol: string;
	server: http.Server | https.Server;
};


export function showServerListeningMessage(server: Server) {
	
	const { address, family, port } = server.server.address() as AddressInfo;
	
	console.info(
		`${server.icon} ${server.name} is listening on`,
		`${server.protocol}://${
			family === "IPv4" ?
				address : (
					address.replace(/^::(?:ffff:)?/, "") ||
					process.env.NODE_ENV === "development" ? "localhost" : "127.0.0.1"
				)
		}:${port}`
	);
	
}
