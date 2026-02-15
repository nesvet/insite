import { Component } from "react";
import { clsx } from "clsx";
import Tooltip from "@material-ui/core/Tooltip";
import { classes } from "./Avatar";
import { subscribe, unsubscribe } from "./subscriptions";


/* eslint-disable no-unused-vars */


export class OrgAvatar extends Component {
	
	render() {
		
		const {
			className,
			for: subject = {},
			tooltip = true,
			size = "m",
			online,
			disableAutoUpdate,
			...restProps
		} = this.props;
		
		const {
			initials = "?",
			avatarUrl,
			title
		} = subject;
		
		let avatar = (
			<div
				className={clsx(
					classes.root,
					classes.org,
					className,
					size && classes[size]
				)}
				{...restProps}
			>
				<div className={classes.contents}>
					{avatarUrl ? (
						<img className={classes.avatar} alt={initials} src={avatarUrl} />
					) : initials}
				</div>
			</div>
		);
		
		const tooltipTitle =
			(tooltip && typeof tooltip == "boolean") ?
				title :
				false;
		
		if (tooltipTitle)
			avatar = (
				<Tooltip
					arrow
					enterDelay={500}
					placement="bottom"
					title={tooltipTitle}
				>
					{avatar}
				</Tooltip>
			);
		
		return avatar;
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
