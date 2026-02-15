import type { ChangeStreamDocument } from "mongodb";


type MaskConfig = {
	readonly sensitive?: ReadonlySet<string>;
	readonly pii?: ReadonlySet<string>;
	readonly skip?: ReadonlySet<string>;
	readonly depth?: number;
};

const enum FieldType {
	Unknown = -1,
	Skip = 0,
	Sensitive = 1,
	Pii = 2
}


const SENSITIVE = [ "password", "secret", "token", "key", "auth", "session", "hash", "salt", "fingerprint" ];
const PII = [ "mail", "phone", "name", "address", "card", "ssn", "passport" ];

const ENV_SENSITIVE = process.env.LOGS_MASK_SENSITIVE?.split(",").map(s => s.trim().toLowerCase()) ?? [];
const ENV_PII = process.env.LOGS_MASK_PII?.split(",").map(s => s.trim().toLowerCase()) ?? [];
const ENV_SKIP = process.env.LOGS_MASK_SKIP?.split(",").map(s => s.trim().toLowerCase()) ?? [ "_id", "id", "timestamp", "created", "updated" ];

const SENSITIVE_SET = Object.freeze(new Set([ ...SENSITIVE, ...ENV_SENSITIVE ]));
const PII_SET = Object.freeze(new Set([ ...PII, ...ENV_PII ]));
const SKIP_SET = Object.freeze(new Set(ENV_SKIP));

const cache = new Map<string, FieldType.Pii | FieldType.Sensitive | FieldType.Skip>();
const CACHE_SIZE = 2048;

const mask = {
	
	email: (v: string): string => {
		const i = v.indexOf("@");
		
		return i > 1 ? `${v[0]}***@${v.slice(i + 1)}` : "***@***";
	},
	
	phone: (v: string): string => {
		
		let digits = "";
		
		for (let i = 0; i < v.length; i++) {
			const c = v.codePointAt(i);
			
			if (c && c >= 48 && c <= 57)
				digits += v[i];
		}
		
		return digits.length > 6 ? `${digits.slice(0, 3)}***${digits.slice(-2)}` : "***";
	},
	
	card: (v: string): string => {
		
		let digits = "";
		
		for (let i = 0; i < v.length; i++) {
			const c = v.codePointAt(i);
			
			if (c && c >= 48 && c <= 57)
				digits += v[i];
		}
		
		return digits.length >= 13 ? `****-****-****-${digits.slice(-4)}` : "****";
	},
	
	generic: (v: string): string => {
		const { length } = v;
		
		return length < 4 ? "***" : length < 9 ? `${v[0]}***` : `${v[0] + v[1]}***${v.slice(-2)}`;
	}
};

const ensureCacheCapacity = (): void => {
	
	if (cache.size >= CACHE_SIZE) {
		const keyToDelete = cache.keys().next().value;
		
		if (keyToDelete)
			cache.delete(keyToDelete);
	}
	
};

function checkField(key: string): FieldType {
	const cached = cache.get(key);
	
	if (cached !== undefined)
		return cached;
	
	const normalized = key.toLowerCase().replaceAll(/[_-]/g, "");
	
	if (SKIP_SET.has(normalized)) {
		ensureCacheCapacity();
		
		cache.set(key, FieldType.Skip);
		
		return FieldType.Skip;
	}
	
	for (const pattern of SENSITIVE_SET)
		if (normalized.includes(pattern)) {
			
			ensureCacheCapacity();
			
			cache.set(key, FieldType.Sensitive);
			
			return FieldType.Sensitive;
		}
	
	for (const pattern of PII_SET)
		if (normalized.includes(pattern)) {
			
			ensureCacheCapacity();
			
			cache.set(key, FieldType.Pii);
			
			return FieldType.Pii;
		}
	
	return FieldType.Unknown;
}

function getMasker(key: string): (v: string) => string {
	const normalized = key.toLowerCase();
	
	if (normalized.includes("mail"))
		return mask.email;
	
	if (normalized.includes("phone") || normalized.includes("tel"))
		return mask.phone;
	
	if (normalized.includes("card") || normalized.includes("credit"))
		return mask.card;
	
	return mask.generic;
}


/**
 * Recursively traverses an object or array and masks sensitive data.
 * The function is immutable and returns a new, masked object.
 * @param data The data to mask.
 * @param config Optional configuration to override default behavior.
 * @returns A deep copy of the data with sensitive fields masked.
 */
export function maskData<T>(data: T, config?: MaskConfig): T {
	const maxDepth = config?.depth ?? 50;
	
	function process(obj: unknown, depth: number): unknown {
		if (depth > maxDepth || obj === null || obj === undefined || typeof obj !== "object")
			return obj;
		
		if (obj instanceof Date)
			return obj;
		
		if (Array.isArray(obj))
			return obj.map(item => process(item, depth + 1));
		
		if (obj.constructor !== Object)
			return obj;
		
		const result: Record<string, unknown> = {};
		
		for (const key in obj) {
			if (!Object.hasOwn(obj, key))
				continue;
			
			const value = (obj as Record<string, unknown>)[key];
			
			if (typeof value === "string" && value.length > 0) {
				const fieldType = checkField(key);
				
				switch (fieldType) {
					case FieldType.Skip:
					case FieldType.Unknown:
						result[key] = value;
						break;
					
					case FieldType.Sensitive:
						result[key] = "[MASKED]";
						break;
					
					case FieldType.Pii:
						result[key] = getMasker(key)(value);
				}
			} else if (value !== null && value !== undefined && typeof value === "object")
				result[key] = process(value, depth + 1);
			else
				result[key] = value;
		}
		
		return result;
	}
	
	return process(data, 0) as T;
}

/**
 * A specific wrapper for masking MongoDB Change Stream documents.
 * It intelligently applies masking only to fields that can contain user data.
 * @param doc The Change Stream document.
 * @param config Optional masking configuration.
 * @returns A new Change Stream document with relevant fields masked.
 */
export function maskChangeStreamDocument<T extends Partial<ChangeStreamDocument>>(doc: T, config?: MaskConfig): T {
	switch (doc.operationType) {
		case "delete":
		case "drop":
		case "dropDatabase":
		case "invalidate":
			return doc;
	}
	
	const result = { ...doc };
	
	if ("fullDocument" in result)
		result.fullDocument = maskData(result.fullDocument, config);
	
	if ("updateDescription" in result && result.updateDescription?.updatedFields)
		result.updateDescription = {
			...result.updateDescription,
			updatedFields: maskData(result.updateDescription.updatedFields, config)
		};
	
	return result;
}

/**
 * Provides utilities for monitoring and managing the masker's internal state.
 */
export const stats = {
	cacheSize: (): number => cache.size,
	clearCache: (): void => cache.clear(),
	patterns: () => ({
		sensitive: Array.from(SENSITIVE_SET),
		pii: Array.from(PII_SET),
		skip: Array.from(SKIP_SET)
	})
};
