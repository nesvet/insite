import { clsx } from "clsx";
import MenuItem from "@material-ui/core/esm/MenuItem";
import ChevronRightIcon from "@material-ui/icons/esm/ChevronRight";
import { classes } from "./classes";
import { ContextMenuItem } from "./Item";
import { ContextMenu } from "./Menu";


/* eslint-disable no-unused-vars */


export class ContextMenuSubMenuItem extends ContextMenuItem {
	
	isHovered = false;
	
	hoverTimeout = null;
	
	isMenuPinned = false;
	
	#handlePointerEnter = () => {
		
		if (this.context.subMenu && this.context.subMenu.superItem !== this)
			this.context.subMenu.superItem._handleSiblingPointerEnter();
		
		this.isHovered = true;
		clearTimeout(this.hoverTimeout);
		this.hoverTimeout = setTimeout(() => this.isHovered && this.menu?.open(this.node), 150);
		
	};
	
	#handlePointerLeave = () => {
		
		this.isHovered = false;
		clearTimeout(this.hoverTimeout);
		if (!this.isMenuPinned)
			this.hoverTimeout = setTimeout(() => !this.isMenuPinned && this.menu?.close(), 150);
		
	};
	
	_handleSiblingPointerEnter = () => {
		
		clearTimeout(this.hoverTimeout);
		this.hoverTimeout = setTimeout(() => !this.isMenuHovered && this.menu?.close(), 150);
		
	};
	
	#handleClick = event => {
		event.stopPropagation();
		this.menu.open(this.node);
		this.props.onClick?.(event);
		
	};
	
	menuAnchorOrigin = { vertical: "top", horizontal: "right" };
	
	menuTransformOrigin = { vertical: "top", horizontal: "left" };
	
	PopoverClasses = { root: classes.subPopover };
	
	#handleMenuPointerEnter = event => {
		
		this.isMenuHovered = true;
		this.isMenuPinned = true;
		this.props.MenuProps?.onPointerEnter?.(event);
		
	};
	
	#handleMenuPointerLeave = event => {
		
		this.isMenuHovered = false;
		this.props.MenuProps?.onPointerLeave?.(event);
		
	};
	
	#handleMenuClose = event => {
		
		this.isMenuPinned = false;
		this.props.MenuProps?.onClose?.(event);
		
	};
	
	#handleRef = node => {
		this.node = node;
		this.menuListNode = node?.getElementsByClassName("MuiMenu-list")[0];
		
	};
	
	#handleMenuRef = menu => {
		if (menu)
			menu.superItem = this;
		this.menu = menu;
		this.props.MenuProps?.ref?.(menu);
		
	};
	
	
	render() {
		
		const {
			className,
			label,
			children,
			MenuProps: { onPointerEnter, onPointerLeave, onClose, ref, ...restMenuProps },
			...restProps
		} = this.props;
		
		return (
			<>
				
				<MenuItem
					className={clsx(classes.item, classes.subItem, className)}
					onClick={this.#handleClick}
					onPointerEnter={this.#handlePointerEnter}
					onPointerLeave={this.#handlePointerLeave}
					{...restProps}
					ref={this.#handleRef}
				>
					<span>
						{label}
					</span>
					<ChevronRightIcon fontSize="small" />
				</MenuItem>
				
				<ContextMenu
					anchorOrigin={this.menuAnchorOrigin}
					PopoverClasses={this.PopoverClasses}
					superMenu={this.context}
					transformOrigin={this.menuTransformOrigin}
					onClose={this.#handleMenuClose}
					onPointerEnter={this.#handleMenuPointerEnter}
					onPointerLeave={this.#handleMenuPointerLeave}
					ref={this.#handleMenuRef}
					{...restMenuProps}
				>
					{children}
				</ContextMenu>
			
			</>
		);
	}
}
