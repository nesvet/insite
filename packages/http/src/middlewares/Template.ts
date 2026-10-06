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


type HeadLink = {
	rel: string;
	href: string;
	type?: string;
	sizes?: string;
};

type HeadMeta = {
	name?: string;
	property?: string;
	content: string;
};

type Options = {
	path?: RegExp;
	globals?: Record<string, unknown>;
	title?: string;
	css?: string[] | string;
	rootId?: string;
	head?: {
		links?: HeadLink[];
		meta?: HeadMeta[];
	};
};

export type { Options as TemplateMiddlewareOptions };


function escapeAttribute(value: string) {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll("\"", "&quot;");
}

function resolveHref(href: string) {
	if (href.startsWith("http://") || href.startsWith("https://"))
		return href;
	
	if (href.startsWith("/"))
		return `${INSITE_STATIC_ROOT}${href}`;
	
	return href;
}

function renderHead(head: NonNullable<Options["head"]>) {
	const links = (head.links ?? []).map(link => {
		const attributes = [
			`rel="${escapeAttribute(link.rel)}"`,
			`href="${escapeAttribute(resolveHref(link.href))}"`
		];
		
		if (link.type)
			attributes.push(`type="${escapeAttribute(link.type)}"`);
		
		if (link.sizes)
			attributes.push(`sizes="${escapeAttribute(link.sizes)}"`);
		
		return `<link ${attributes.join(" ")}>`;
	});
	
	const meta = (head.meta ?? []).map(item => {
		const attributes: string[] = [];
		
		if (item.name)
			attributes.push(`name="${escapeAttribute(item.name)}"`);
		
		if (item.property)
			attributes.push(`property="${escapeAttribute(item.property)}"`);
		
		attributes.push(`content="${escapeAttribute(item.content)}"`);
		
		return `<meta ${attributes.join(" ")} />`;
	});
	
	return [ ...links, ...meta ].join("");
}


export class TemplateMiddleware extends ClassMiddleware {
	constructor({
		path = /.*/,
		globals = {},
		title = INSITE_TITLE ?? "inSite",
		css = [],
		rootId = "root",
		head = {}
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
			renderHead(head) +
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
