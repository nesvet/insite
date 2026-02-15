import { Component } from "react";
import { clsx } from "clsx";
import MenuItem from "@material-ui/core/esm/MenuItem";
import { classes } from "./classes";
import { ContextMenuContext } from "./context";


export class ContextMenuItem extends Component {
	
	#handlePointerEnter = () => this.context.subMenu?.superItem._handleSiblingPointerEnter();
	
	#handleRef = node => (this.node = node);
	
	
	render() {
		
		const { className, label, children, ...restProps } = this.props;
		
		return (
			<MenuItem
				className={clsx(classes.item, className)}
				onPointerEnter={this.#handlePointerEnter}
				ref={this.#handleRef}
				{...restProps}
			>
				{children || label}
			</MenuItem>
		);
	}
	
	
	static contextType = ContextMenuContext;
	
}
