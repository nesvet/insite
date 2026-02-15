import { matchSymbol } from "./symbols";
import type { Request } from "./Request";
import type { RequestParams, RequestQueryParams } from "./types";


/* eslint-disable @typescript-eslint/no-explicit-any */


const pathRegExp = /\/(?:(\*)|:([^/?]+)(\?(.*))?)/g;

function subPathToRegExpSource(path: string, index = 0): string {
	return path.replaceAll(pathRegExp, (_, wildcard, param, optional, subPath) => {
		if (wildcard)
			return `/(?<__${index++}>.*?)`;
		
		const group = `/(?<${param}>[^/]+)`;
		
		return optional ?
			`(?:${group}${subPath ? subPathToRegExpSource(subPath, index) : ""})?` :
			group;
	});
}

export function pathToRegExp(path: string) {
	return new RegExp(`^${path.startsWith("/") ? "" : "/"}${subPathToRegExpSource(path)}/?$`);
}


const wildcardKeyRegExp = /^__/;

export function extractUrlParams(request: Request<any>): RequestParams {
	const match = request[matchSymbol];
	
	if (match) {
		delete request[matchSymbol];
		
		const params = [ undefined, ...match.slice(1) ] as RequestParams;
		
		if (match.groups)
			for (const [ key, value ] of Object.entries(match.groups))
				params[key.replace(wildcardKeyRegExp, "")] = value;
		
		return params;
	}
	
	return [] as unknown as RequestParams;
}


export function extractQueryParams({ querystring }: Request<any>): RequestQueryParams {
	return querystring?.split("&").reduce((queryParams, pair) => {
		const [ key, value ] = pair.split("=");
		
		try {
			queryParams[key] = decodeURIComponent(value || "");
		} catch {
			queryParams[key] = "";
		}
		
		return queryParams;
	}, {} as RequestQueryParams) ?? {};
}

export function extractBearerToken({ headers: { authorization } }: Request<any>) {
	if (authorization?.indexOf("Bearer ") === 0)
		return authorization.slice(7);
	
	return null;
}
