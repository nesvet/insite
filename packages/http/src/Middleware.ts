import { HTTPServer } from "./Server";
import type {
	Handler,
	Method,
	Priority,
	RegExpOrString
} from "./types";


export class ClassMiddleware {
	priority: Priority = 0;
	listeners!: Partial<Record<Method, [ RegExpOrString, Handler, Priority? ][]>>;
	bindTo?(server: HTTPServer): void;
}
