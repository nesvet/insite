import { createStyles, theme } from "$styles";
import { OrgAvatar } from "./OrgAvatar";
import { sizes } from "./styles";
import { UserAvatar } from "./UserAvatar";


/* eslint-disable react/destructuring-assignment */


const fontSizeRatio = 1.77777778;

const borderRatio = 35;

export const borders = Object.fromEntries(Object.entries(sizes).map(([ key, value ]) => [ key, Math.max(Math.round(value / borderRatio), 1) ]));

export const styles = {
	
	root: {
		flexShrink: "0",
		position: "relative",
		borderRadius: "50%",
		
		"&:hover": {
			zIndex: "100 !important"
		}
	},
	
	org: {
		borderRadius: "20%",
		fontWeight: "bold"
	},
	
	...Object.fromEntries(Object.entries(sizes).map(([ key, value ]) => [ key, {
		width: value,
		height: value,
		fontSize: value / fontSizeRatio
	} ])),
	
	online: {},
	
	contents: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		width: "100%",
		height: "100%",
		color: theme.palette.background.default,
		backgroundColor: theme.palette.grey[400],
		borderRadius: "50%",
		overflow: "hidden",
		textTransform: "uppercase",
		userSelect: "none",
		
		...Object.fromEntries(Object.entries(borders).map(([ key, value ]) => [ `$${key} &`, {
			outline: `${value}px solid ${theme.alpha(theme.palette.text.primary, .125)}`,
			outlineOffset: -value
		} ])),
		
		"$org &": {
			borderRadius: "20%",
			fontSize: "1.4em",
			lineHeight: 1.19,
			alignItems: "flex-end"
		}
	},
	
	avatar: {
		width: "100%"
	},
	
	onlineIndicator: {
		position: "absolute",
		right: 0,
		bottom: 0,
		width: "25%",
		height: "25%",
		backgroundColor: theme.palette.success.main,
		border: `2px solid var(--background-color, ${theme.palette.background.paper})`,
		borderRadius: "50%",
		transform: "scale(0)",
		transitionProperty: "transform",
		transitionDuration: theme.transitions.duration.shortest,
		pointerEvents: "none",
		
		"$online &": {
			transform: "scale(1)"
		},
		
		...Object.fromEntries(Object.entries(sizes).map(([ key ]) => [ `$${key}$online &`, {
			borderWidth: borders[key]
		} ]))
	}
	
};

export const classes = createStyles(styles, "Avatar");


export function Avatar(props) {
	return props.for?.isOrg ? (
		<OrgAvatar {...props} />
	) : (
		<UserAvatar {...props} />
	);
}

Avatar.sizes = sizes;

Avatar.borders = borders;

Avatar.styles = styles;

Avatar.classes = classes;
