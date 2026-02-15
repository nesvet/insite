import { isEmpty } from "@nesvet/n";
import { handleRequestCompressed } from "../compression";
import { ClassMiddleware } from "../Middleware";
import { Handler } from "../types";


const {
	INSITE_STATIC_ROOT = "",
	INSITE_TITLE
} = process.env;

const envGlobals: Record<string, unknown> = {};
for (const key in process.env)
	if (key.startsWith("INSITE_CLIENT_"))
		envGlobals[key.replace(/INSITE_CLIENT_/, "").toLowerCase()] = process.env[key];

const headers = { "Content-Type": "text/html; charset=utf-8" };


type Options = {
	path?: RegExp;
	globals?: Record<string, unknown>;
	title?: string;
	css?: string[] | string;
	rootId?: string;
};

export type { Options as TemplateMiddlewareOptions };


export class TemplateMiddleware extends ClassMiddleware {
	constructor({
		path = /.*/,
		globals = {},
		title = INSITE_TITLE ?? "inSite",
		css = [],
		rootId = "root"
	}: Options = {}) {
		super();
		
		this.listeners = {
			GET: [ [ path, this.#handler ] ]
		};
		
		this.#title = title;
		this.#css = Array.isArray(css) ? css : [ css ];
		this.#rootId = rootId;
		
		Object.assign(globals, envGlobals);
		
		this.#html =
			"<!DOCTYPE html>" +
			"<html lang=\"ru\">" +
			"<head>" +
			"<meta charset=\"utf-8\" />" +
			"<meta name=\"viewport\" content=\"minimum-scale=1, initial-scale=1, width=device-width\" />" +
			`<title>${this.#title}</title>` +
			`<link rel="icon" type="image/x-icon" href="${INSITE_STATIC_ROOT}/favicon.ico">` +
			`${this.#css.map(fileName => `<link rel="stylesheet" href="${INSITE_STATIC_ROOT}/${fileName}" />`).join("")}` +
			`${isEmpty(globals) ? "" : `<script>globalThis.__insite=${JSON.stringify(globals)};</script>`}` +
			`<script type="text/javascript" src="${INSITE_STATIC_ROOT}/index.js" defer></script>` +
			"</head>" +
			"<body>" +
			`<div id="${this.#rootId}">` +
			"</div>" +
			"</body>" +
			"</html>";
		
	}
	
	priority = -1000;
	
	#title;
	#css;
	#rootId;
	#html;
	
	#handler: Handler = (request, response) =>
		handleRequestCompressed(request, response, headers, this.#html);
	
}
