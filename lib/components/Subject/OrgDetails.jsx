import { Component } from "react";
import { clsx } from "clsx";
import { createStyles } from "$styles";
import { subscribe, unsubscribe } from "./subscriptions";


/* eslint-disable no-unused-vars */


const classes = createStyles({
	
	root: {},
	
	title: {
		fontWeight: 500
	}
	
}, "OrgDetails");


export class OrgDetails extends Component {
	
	render() {
		
		const {
			className,
			classes: classesProp,
			for: subject = {},
			title = true,
			name,
			job,
			disableAutoUpdate,
			...restProps
		} = this.props;
		
		
		return (
			<div className={clsx(classes.root, classesProp?.details, className)} {...restProps}>
				{title && (
					<div className={clsx(classes.title, classesProp?.title)}>
						{subject.title || "—"}
					</div>
				)}
			</div>
		);
	}
	
	componentDidMount() {
		
		const { disableAutoUpdate, subject } = this.props;
		
		if (!disableAutoUpdate && subject?._id)
			subscribe(this);
		
	}
	
	componentWillUnmount() {
		
		unsubscribe(this);
		
	}
	
}
