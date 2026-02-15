import { Component, ReactNode } from "react";
import { noop } from "@nesvet/n";
import {
	Subscription,
	SubscriptionGroup,
	type SubscriptionGroupOptions,
	type SubscriptionGroupUnparsedDefinition
} from "insite-subscriptions-client";


/* eslint-disable react/destructuring-assignment */


type SubscriptionGroupValues = any[] & Record<string, any>;// eslint-disable-line @typescript-eslint/no-explicit-any

type Props = {
	definitions: SubscriptionGroupUnparsedDefinition[];
	target: SubscriptionGroupOptions["target"];
	debounce: SubscriptionGroupOptions["debounce"];
	valuesRef: (values: SubscriptionGroupValues) => void;
	consistent: boolean;
	children: (isLoaded: boolean, values: SubscriptionGroupValues) => ReactNode;
	onUpdate: (group: SubscriptionGroup) => void;
};

type State = object | undefined;


export class SubscriptionGroupComponent extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		
		this.group = new SubscriptionGroup(props.definitions, {
			target: props.target,
			debounce: props.debounce,
			immediately: false
		});
		
		this.group.on("update", () => this.handleUpdate());
		
		props.valuesRef?.(this.group.values);
		
	}
	
	group;
	
	state = this.props.consistent ? undefined : {};
	
	definitionsSnapshot = this.props.consistent ? undefined : JSON.stringify(this.props.definitions);
	
	get isLoaded() {
		return this.group.isLoaded;
	}
	
	get isInited() {
		return this.group.isInited;
	}
	
	get values() {
		return this.group.values;
	}
	
	redefine = (definitions: SubscriptionGroupUnparsedDefinition[]) => this.group.redefine(definitions);
	
	subscribe = () => this.group.subscribe();
	
	unsubscribe = () => this.group.unsubscribe();
	
	
	shouldComponentUpdate =
		this.props.consistent ?
			undefined :
			SubscriptionGroupComponent.inconsistentShouldComponentUpdate;
	
	render() {
		return this.props.children?.(this.group.isLoaded, this.group.values) || null;
	}
	
	
	handleUpdate() {
		
		this.props.onUpdate?.(this.group);
		
	}
	
	componentDidMount() {
		
		this.subscribe();
		
		this.handleUpdate =
			this.props.consistent ?
				SubscriptionGroupComponent.consistentHandleUpdate :
				SubscriptionGroupComponent.inconsistentHandleUpdate;
		
	}
	
	componentWillUnmount() {
		
		this.handleUpdate = noop;
		
		this.unsubscribe();
		
	}
	
	
	static inconsistentShouldComponentUpdate(this: SubscriptionGroupComponent, nextProps: Props) {
		if (this.props.target !== nextProps.target || this.props.debounce !== nextProps.debounce)
			this.group.applyOptions({ target: nextProps.target, debounceLimit: nextProps.debounce });
		
		const definitionsSnapshot = JSON.stringify(nextProps.definitions);
		
		if (this.definitionsSnapshot === definitionsSnapshot)
			return true;
		
		this.definitionsSnapshot = definitionsSnapshot;
		void this.redefine(nextProps.definitions);
		
		return false;
	}
	
	static consistentHandleUpdate(this: SubscriptionGroupComponent) {
		
		this.props.onUpdate?.(this.group);
		this.forceUpdate();
		
	}
	
	static inconsistentHandleUpdate(this: SubscriptionGroupComponent) {
		
		this.props.onUpdate?.(this.group);
		this.setState({});
		
	}
	
	static bindTo = Subscription.bindTo;
	
}
