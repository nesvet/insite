import { clsx } from "clsx";
import Typography from "@material-ui/core/esm/Typography";
import { classes } from "./classes";


export function ContextMenuTitle({ className, children, ...restProps }) {
	return (
		<Typography
			className={clsx(classes.title, className)}
			component="li"
			variant="overline"
			{...restProps}
		>
			{children}
		</Typography>
	);
}
