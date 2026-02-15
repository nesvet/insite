import { Extension } from "./types";


export const defaultExtensions = [
	
	[ "js", {
		isText: true,
		mimeType: "text/javascript"
	} ],
	
	[ "css", {
		isText: true,
		mimeType: "text/css"
	} ],
	
	[ "ico", {
		mimeType: "image/x-icon"
	} ],
	
	process.env.NODE_ENV === "development" ? [ "css.map", {
		isText: true,
		mimeType: "application/json"
	} ] : null,
	
	process.env.NODE_ENV === "development" ? [ "js.map", {
		isText: true,
		mimeType: "application/json"
	} ] : null,
	
	[ "jpg", {
		mimeType: "image/jpeg"
	} ],
	
	[ "jpeg", {
		mimeType: "image/jpeg"
	} ]
	
].filter(Boolean) as Extension[];
