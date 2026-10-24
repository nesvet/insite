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

const remoteAddressRegExp = /^.*?((?:\d{1,3}\.){3}\d{1,3}).*$/;
const ipv6AddressRegExp = /^(?:[\dA-Fa-f]{0,4}:){2,7}[\dA-Fa-f]{0,4}$/;

function ipv4From(value: string) {
	return remoteAddressRegExp.exec(value)?.[1];
}

function ipv6From(value: string) {
	if (!value.includes(":"))
		return;
	
	const stripped = value.replaceAll("[", "").replaceAll("]", "");
	
	for (const token of stripped.split(/[^\d%:A-Fa-f]+/)) {
		const [ address ] = token.split("%", 1);
		
		if (address && ipv6AddressRegExp.test(address))
			return address;
	}
	
}

function addressFrom(value: string | undefined) {
	if (!value)
		return;
	
	return ipv4From(value) ?? ipv6From(value);
}

export function getRemoteAddress(request: IncomingMessage) {
	for (const headerName of headersThatMayContainRemoteAddress) {
		const header = request.headers[headerName];
		
		if (typeof header == "string") {
			const address = addressFrom(header);
			
			if (address)
				return address;
		}
	}
	
	return addressFrom(request.socket?.remoteAddress) ?? "127.0.0.1";
}
