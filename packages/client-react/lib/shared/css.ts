import { useLayoutEffect } from "react";
import { isDev } from "./env";


const supportsAdoption = typeof document !== "undefined" && "adoptedStyleSheets" in document;

class Sheet {
	
	#sheet: CSSStyleSheet;
	#targets = new WeakSet<Document | ShadowRoot>();
	
	constructor(css: string) {
		
		this.#sheet = new CSSStyleSheet();
		
		this.#sheet.replaceSync(css);
		
	}
	
	mount(root: Document | ShadowRoot): void {
		if (!supportsAdoption || this.#targets.has(root))
			return;
		
		root.adoptedStyleSheets = [ ...root.adoptedStyleSheets, this.#sheet ];
		
		this.#targets.add(root);
		
	}
	
	unmount(root: Document | ShadowRoot): void {
		if (!supportsAdoption || !this.#targets.has(root))
			return;
		
		root.adoptedStyleSheets = root.adoptedStyleSheets.filter(s => s !== this.#sheet);
		
		this.#targets.delete(root);
		
	}
}


export type SheetAccessor = () => Sheet;

export function createSheet(css: string): SheetAccessor {
	
	let instance: Sheet | undefined;
	
	return () => (instance ??= new Sheet(css));
}


export function useSheet(getSheet: SheetAccessor, root: Document | ShadowRoot = document): void {
	
	useLayoutEffect(() => {
		
		const sheet = getSheet();
		
		sheet.mount(root);
		
		if (isDev)
			return () => sheet.unmount(root);
	}, [ getSheet, root ]);
	
}
