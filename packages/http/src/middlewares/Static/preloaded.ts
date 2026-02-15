export const defaultPreloaded = [
	...process.env.NODE_ENV === "production" ? [
		//#if _SSR
		// "/index.css",
		//#endif
		"/index.js",
		"/favicon.ico"
	] : []
];
