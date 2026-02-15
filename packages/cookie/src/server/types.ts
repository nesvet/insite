export type Cookie = Record<string, string>;

export type CookieOptions = {
	maxAge?: number;
	expiresAt?: Date;
	domain?: string;
	path?: false | string | null;
	secure?: boolean;
	httpOnly?: boolean;
	sameSite?: string;
};
