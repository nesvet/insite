import React, { forwardRef, useEffect, useRef } from "react";
import {
	createSheet,
	useSheet,
	type PolymorphicComponent,
	type PolymorphicRef
} from "../../shared";
import styles from "./styles.css?raw";


/* eslint-disable @typescript-eslint/naming-convention, @stylistic/max-statements-per-line */


const getSheet = createSheet(styles);

type CollapseCSSVars = {
	"--is-collapse-duration"?: string;
	"--is-collapse-easing"?: string;
};

export type CollapseProps = {
	in?: boolean;
	orientation?: "both" | "horizontal" | "vertical";
	fade?: boolean;
	className?: string;
	style?: CollapseCSSVars & React.CSSProperties;
};


export const Collapse = forwardRef(<C extends React.ElementType = "div">({
	as,
	in: isOpen,
	orientation = "vertical",
	fade,
	className,
	style,
	...rest
}: CollapseProps & { as?: C }, ref: PolymorphicRef<C>) => {
	
	useSheet(getSheet);
	
	const isMountedRef = useRef(false);
	
	useEffect(() => { isMountedRef.current = true; }, []);
	
	const Component = as || "div";
	
	return (
		<Component
			className={`iS-Collapse${className ? ` ${className}` : ""}`}
			data-fade={fade || undefined}
			data-mounted={isMountedRef.current || undefined}
			data-orientation={orientation}
			data-state={isOpen ? "open" : "closed"}
			style={style}
			ref={ref}
			{...rest}
		/>
	);
}) as PolymorphicComponent<"div", CollapseProps>;

Collapse.displayName = "Collapse";
