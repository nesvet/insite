export const regexps = {
	_id: /^[\dA-Fa-f]{24}$/,
	email: /^[^\s@]{1,63}@[^\s@]{1,63}\.[^\s@]{1,63}$/,
	argon2: /^\$argon2(?:i|d|id)\$v=\d+\$m=\d+,t=\d+,p=\d+(?:\$[\d+/A-Za-z]+){2}$/,
	// eslint-disable-next-line unicorn/better-regex
	sessionId: /^(?:[\dA-Fa-f]{16,32}\$[\dA-Fa-f]{16,32}|[0-9a-f]{24}~[A-Za-z0-9_-]{43})$/, // (?:old_format|new_format) - leave just the new after some time
	role: /^[\d_a-z-]{1,64}$/,
	ip: /^(?:\d{1,3}\.){3}\d{1,3}$/
};
