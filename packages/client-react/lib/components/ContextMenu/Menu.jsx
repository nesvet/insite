import { Component } from "react";
import { clsx } from "clsx";
import { dispatchEventThrough } from "@nesvet/ui-utils";
import Fade from "@material-ui/core/esm/Fade";
import Menu from "@material-ui/core/esm/Menu";
import { theme } from "$styles";
import { classes } from "./classes";
import { ContextMenuContext } from "./context";
import { ContextMenuDivider } from "./Divider";
import { ContextMenuItem } from "./Item";
import { ContextMenuSubMenuItem } from "./SubMenuItem";
import { ContextMenuTitle } from "./Title";


/* eslint-disable no-unused-vars, react/destructuring-assignment */


const spacing = theme.spacing(1);

const muiMenuPaperClass = "MuiMenu-paper";
const muiMenuItemClass = "MuiMenuItem-root";

const distanceForUpClick = 6;
const timeoutForUpClick = 500;


export class ContextMenu extends Component {
	constructor(props) {
		super(props);
		
		if (props.contextField)
			this.#contextField = props.contextField;
		
		this[this.#contextField] = this.#context;
		
	}
	
	state = {
		isOpened: false,
		position: undefined,
		anchor: undefined
	};
	
	#event;
	#anchor;
	#context = null;
	#contextField = "ctx";
	
	#isPointerDowned = false;
	#cursorDistance = 0;
	#openAt = 0;
	
	#onClose = null;
	
	superMenu = this.props.superMenu;
	
	subMenu = null;
	
	open = ({ event, anchor, prepend, append, onClose }, context = null) => {
		if (process.env.NODE_ENV !== "development" || !event?.metaKey) {
			this.#context =
				this[this.#contextField] =
					context;
			
			if (this.superMenu)
				this.superMenu.subMenu = this;
			
			if (prepend)
				this.#prepended = typeof prepend == "function" ? prepend(context) : prepend;
			
			if (append)
				this.#appended = typeof append == "function" ? append(context) : append;
			
			this.#event = event;
			this.#anchor = anchor;
			
			this.setState({
				isOpened: true,
				...event && { position: { top: event.clientY - spacing, left: event.clientX } },
				...anchor && { anchor }
			});
			
			this.#cursorDistance = 0;
			this.#openAt = Date.now();
			
			if (onClose)
				this.#onClose = onClose;
			
		}
		
	};
	
	update({ event = this.#event, anchor = this.#anchor, prepend, append, onClose, context = this.#context }) {
		return this.open({ event, anchor, prepend, append, onClose }, context);
	}
	
	focus = () => this.menuListNode?.focus();
	
	close = () => {
		
		if (this.subMenu) {
			this.subMenu.close();
			this.subMenu = null;
		}
		
		if (this.#onClose) {
			this.#onClose(this.#context);
			this.#onClose = null;
		}
		
		this.#context =
			this[this.#contextField] =
				null;
		
		this.setState({ isOpened: false, position: undefined }, (this.#prepended || this.#appended) && (() => {
			
			this.#prepended = null;
			this.#appended = null;
			
		}));
		
		this.#isPointerDowned = false;
		
		this.props.onClose?.();
		
	};
	
	#PaperProps = { variant: "outlined" };
	
	#transitionDurationProp = { enter: 0, exit: theme.transitions.duration.leavingScreen };
	
	#TransitionProps = {
		onEntered: this.focus
	};
	
	#handlePointerDown = event => {
		
		this.#isPointerDowned = true;
		
		if (event.button === 2 && !event.target.closest(`.${muiMenuPaperClass}`)) {
			this.close();
			event.type = "contextmenu";
			dispatchEventThrough(event, this.node);
		}
		
	};
	
	#handlePointerMove = ({ movementX, movementY }) => this.#cursorDistance < distanceForUpClick && (this.#cursorDistance += Math.abs(movementX) + Math.abs(movementY));
	
	#handlePointerUp = event => {
		
		if ((!this.#isPointerDowned || event.button === 2) && (this.#cursorDistance >= distanceForUpClick || (this.#openAt + timeoutForUpClick) <= Date.now())) {
			const menuItem = event.target.closest(`.${muiMenuItemClass}`);
			if (menuItem)
				menuItem.click();
			else
				this.close();
		}
		
	};
	
	#handleClick = event => event.target.closest(`.${muiMenuItemClass}`) && this.close();
	
	#handleKeyDown = event => {
		event.stopPropagation();
		
		if (event.key === "ArrowLeft") {
			if (this.superMenu)
				this.close();
		} else if (event.key === "ArrowRight" && event.target.classList.contains(classes.subItem))
			event.target.click();
		
		
	};
	
	#handleRef = node => {
		this.node = node;
		this.menuListNode = node?.getElementsByClassName("MuiMenu-list")[0];
		
	};
	
	
	#children = null;
	#prepended = null;
	#appended = null;
	
	render() {
		
		const { className, paperClassName, PopoverClasses, children, contextField, superMenu, onOpen, onClose, ...restProps } = this.props;
		const { isOpened, position, anchor } = this.state;
		
		if (isOpened)
			this.#children =
				typeof children == "function" ?
					children(this.#context, this) :
					children;
		
		return (
			<Menu
				className={clsx(classes.root, !isOpened && classes.through, className)}
				classes={{ paper: clsx(classes.paper, paperClassName) }}
				anchorEl={anchor}
				anchorPosition={position}
				anchorReference={anchor ? "anchorEl" : "anchorPosition"}
				elevation={0}
				getContentAnchorEl={null}
				marginThreshold={4}
				open={isOpened}
				PaperProps={this.#PaperProps}
				PopoverClasses={PopoverClasses}
				TransitionComponent={Fade}
				transitionDuration={this.#transitionDurationProp}
				TransitionProps={this.#TransitionProps}
				onClick={this.#handleClick}
				onClose={this.close}
				onKeyDown={this.#handleKeyDown}
				onPointerDown={this.#handlePointerDown}
				onPointerMove={this.#handlePointerMove}
				onPointerUp={this.#handlePointerUp}
				{...restProps}
				ref={this.#handleRef}
			>
				<ContextMenuContext.Provider value={this}>
					{this.#prepended}
					{this.#children}
					{this.#appended}
				</ContextMenuContext.Provider>
			</Menu>
		);
	}
	
	componentDidUpdate(_, prevState) {
		
		const { isOpened, position } = this.state;
		
		if (isOpened)
			if (prevState.isOpened) {
				// @WORKAROUND: keep focus on the list when the menu is just re-positioned
				if (position !== prevState.position)
					setTimeout(this.focus, 0);
			} else
				this.props.onOpen?.();
		
		
	}
	
	
	static Title = ContextMenuTitle;
	
	static Item = ContextMenuItem;
	
	static Divider = ContextMenuDivider;
	
	static SubMenuItem = ContextMenuSubMenuItem;
	
}
