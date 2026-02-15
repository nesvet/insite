import { createStyles } from "$styles";


export const classes = createStyles(({ spacing, palette, alpha, typography, shape }) => ({
	
	root: {},
	
	through: {
		pointerEvents: "none"
	},
	
	paper: {
		backgroundColor: alpha(palette.background.default, .7),
		backdropFilter: `blur(${spacing(1.5)}px)`,
		boxShadow: "0px 6px 6px -3px rgba(0, 0, 0, .07), 0px 10px 14px 1px rgba(0, 0, 0, .05), 0px 4px 18px 3px rgba(0, 0, 0, .05)",
		borderRadius: shape.borderRadius * 2,
		maxWidth: spacing(50),
		
		"& .MuiList-root": {
			padding: shape.borderRadius,
			display: "flex",
			flexFlow: "column nowrap",
			
			"& > *": {
				flex: "1 0 auto"
			},
			
			"& .MuiListItem-root": {
				padding: [ spacing(.375), spacing(1.25) ],
				borderRadius: shape.borderRadius,
				fontSize: typography.body2.fontSize,
				textOverflow: "ellipsis",
				
				"& > *": {
					pointerEvents: "none"
				}
			},
			
			"& .MuiListItem-button": {
				transition: "initial",
				
				"&:hover": {
					color: palette.background.default,
					backgroundColor: palette.primary.light
				}
			}
		}
	},
	
	item: {
		
		"&:not(:last-child)": {
			marginBottom: 1
		}
	},
	
	title: {
		padding: [ spacing(.5), spacing(.5) ],
		lineHeight: 1.25,
		hyphens: "auto",
		color: palette.text.disabled,
		pointerEvents: "none",
		
		"&:not(:first-child)": {
			
			"&:before": {
				content: "\"\"",
				display: "block",
				height: 1,
				margin: [ spacing(.5), -spacing(1), spacing(1) ],
				backgroundColor: palette.divider
			}
		},
		
		"& + $divider": {
			display: "none"
		}
	},
	
	divider: {
		margin: [ spacing(.625), spacing(1.25) ],
		height: 1,
		backgroundColor: palette.divider,
		pointerEvents: "none",
		
		"& + $divider": {
			display: "none"
		}
	},
	
	subItem: {
		display: "flex",
		flexFlow: "row nowrap",
		alignItems: "center",
		justifyContent: "space-between",
		
		"& > .MuiSvgIcon-root": {
			margin: [ -spacing(.5), -spacing(.75), -spacing(.5), 0 ]
		}
	},
	
	subPopover: {
		pointerEvents: "none",
		
		"& $paper": {
			pointerEvents: "auto",
			transform: `translateY(-${shape.borderRadius + 1}px)`
		}
	}
	
}), "ContextMenu");
