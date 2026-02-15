import type { IncomingMessage } from "node:http";


const headersThatMayContainRemoteAddress = [
	"forwarded",
	"x-forwarded",
	"forwarded-for",
	"x-forwarded-for",
	"x-real-ip",
	"cf-connecting-ip",
	"do-connecting-ip",
	"x-appengine-user-ip",
	"true-client-ip",
	"fastly-client-ip",
	"client-ip",
	"x-client-ip",
	"x-proxyuser-ip",
	"x-cluster-client-ip"
] as const;

let host: string | undefined;
let headerWithRemoteAddress: typeof headersThatMayContainRemoteAddress[number] | false | null | undefined;

const remoteAddressRegExp = /^.*?((?:\d{1,3}\.){3}\d{1,3}).*$/;

export function getRemoteAddress(request: IncomingMessage) {
	if (headerWithRemoteAddress === undefined || host !== request.headers.host) {
		headerWithRemoteAddress = undefined;
		({ host } = request.headers);
		
		for (const headerName of headersThatMayContainRemoteAddress) {
			const header = request.headers[headerName];
			if (typeof header == "string" && remoteAddressRegExp.test(header))
				headerWithRemoteAddress = headerName;
		}
		
		headerWithRemoteAddress ??=
			request.socket.remoteAddress && remoteAddressRegExp.test(request.socket.remoteAddress) ?
				false :
				null;
	}
	
	switch (headerWithRemoteAddress) {
		case false:
			return request.socket.remoteAddress!.replace(remoteAddressRegExp, "$1");
		
		case null:
			return "127.0.0.1";
		
		default:
			return (request.headers[headerWithRemoteAddress] as string).replace(remoteAddressRegExp, "$1");
	}
}
