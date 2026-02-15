import type { SubscriptionGroup } from "./SubscriptionGroup";
import type { SubscriptionGroupItem } from "./SubscriptionGroupItem";
import type { SubscriptionType } from "./types";


export const privates: {
	groupLoad?: (group: SubscriptionGroup) => void;
	groupInit?: (group: SubscriptionGroup) => void;
	groupUnload?: (group: SubscriptionGroup) => void;
	itemLoad?: <T extends SubscriptionType>(item: SubscriptionGroupItem<T>) => void;
	itemInit?: <T extends SubscriptionType>(item: SubscriptionGroupItem<T>) => void;
	itemUnload?: <T extends SubscriptionType>(item: SubscriptionGroupItem<T>) => void;
} = {};
