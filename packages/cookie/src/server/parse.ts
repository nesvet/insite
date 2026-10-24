export function parseCookie(cookie: string) {
	return cookie ? cookie.split(/;\s*/).reduce((object, keyEqValue) => {
		const separatorIndex = keyEqValue.indexOf("=");
		const key = separatorIndex === -1 ? keyEqValue : keyEqValue.slice(0, separatorIndex);
		const value = separatorIndex === -1 ? undefined : keyEqValue.slice(separatorIndex + 1);
		
		try {
			object[key] = JSON.parse(value as string);
		} catch {
			object[key] = value;
		}
		
		return object;
	}, {} as Record<string, unknown>) : {};
}
