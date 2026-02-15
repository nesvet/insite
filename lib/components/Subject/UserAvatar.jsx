import { Component } from "react";
import { clsx } from "clsx";
import Tooltip from "@material-ui/core/Tooltip";
import { classes } from "./Avatar";
import { subscribe, unsubscribe } from "./subscriptions";


/* eslint-disable react/destructuring-assignment, no-unused-vars */


export class UserAvatar extends Component {
	
	render() {
		
		const {
			className,
			for: subject = {},
			online = true,
			tooltip = true,
			size = "m",
			disableAutoUpdate,
			...restProps
		} = this.props;
		
		const {
			initials = "?",
			avatarUrl,
			isOnline,
			displayLabel
		} = subject;
		
		let avatar = (
			<div
				className={clsx(
					classes.root,
					className,
					size && classes[size],
					isOnline && classes.online
				)}
				{...restProps}
			>
				<div className={classes.contents}>
					{avatarUrl ? (
						<img className={classes.avatar} alt={initials} src={avatarUrl} />
					) : initials}
				</div>
				{online && isOnline !== undefined && (
					<div className={classes.onlineIndicator} />
				)}
			</div>
		);
		
		if (tooltip === true)
			avatar = (
				<Tooltip
					arrow
					enterDelay={500}
					placement="bottom"
					title={displayLabel}
				>
					{avatar}
				</Tooltip>
			);
		
		return avatar;
	}
	
	componentDidMount() {
		
		if (!this.props.disableAutoUpdate)
			subscribe(this);
		
	}
	
	componentWillUnmount() {
		
		unsubscribe(this);
		
	}
	
}
