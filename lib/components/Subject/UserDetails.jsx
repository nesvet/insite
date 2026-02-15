import { Component } from "react";
import { clsx } from "clsx";
import { createStyles } from "$styles";
import { sizes } from "./styles";
import { subscribe, unsubscribe } from "./subscriptions";


/* eslint-disable react/destructuring-assignment, no-unused-vars */


const classes = createStyles(({ spacing }) => ({
	
	root: {
		display: "flex",
		flexFlow: "column nowrap"
	},
	
	vertical: {
		alignItems: "center"
	},
	
	...Object.fromEntries(Object.entries(sizes).map(([ key, value ]) => [ key, {
		fontSize: spacing(1.5) + Math.floor(value / 12)
	} ])),
	
	name: {
		lineHeight: 1.2
	},
	
	firstName: {},
	
	lastName: {},
	
	job: {
		fontSize: ".75em",
		letterSpacing: ".03333em",
		textTransform: "lowercase",
		opacity: .62,
		
		"$vertical &": {
			lineHeight: 2
		}
	}
	
}), "UserDetails");


export class UserDetails extends Component {
	
	render() {
		
		const {
			className,
			classes: classesProp,
			vertical,
			size,
			for: subject = {},
			title,
			name = true,
			job = true,
			disableAutoUpdate,
			...restProps
		} = this.props;
		
		return (
			<div className={clsx(classes.root, vertical && classes.vertical, classes[size], classesProp?.details, className)} {...restProps}>
				{name && (
					<div className={clsx(classes.name, classesProp?.name)}>
						{subject.name ? (
							<>
								<span className={clsx(classes.firstName, classesProp?.firstName)}>
									{subject.name?.first}
								</span>
								{" "}
								<span className={clsx(classes.lastName, classesProp?.lastName)}>
									{subject.name?.last}
								</span>
							</>
						) : "—"}
					</div>
				)}
				{job && subject.job && (
					<div className={clsx(classes.job, classesProp?.job)}>
						{subject.job}
					</div>
				)}
			</div>
		);
	}
	
	componentDidMount() {
		
		if (!this.props.disableAutoUpdate)
			subscribe(this);
		
	}
	
	componentWillUnmount() {
		
		unsubscribe(this);
		
	}
	
}
