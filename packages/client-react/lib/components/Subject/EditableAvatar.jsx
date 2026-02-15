import { Component } from "react";
import { clsx } from "clsx";
import { Dropzone } from "@nesvet/missing-mui4-components/Dropzone";
import IconButton from "@material-ui/core/esm/IconButton";
import EditIcon from "@material-ui/icons/esm/Edit";
import { createStyles } from "$styles";
import { ContextMenu, ContextMenuItem } from "../ContextMenu";
import { Avatar } from "./Avatar";


const classes = createStyles(({ palette, transitions, alpha }) => ({
	
	dropzone: {},
	
	edit: {
		position: "absolute",
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		opacity: 0,
		color: palette.background.paper,
		backgroundColor: `${alpha(palette.text.primary, .5)} !important`,
		transitionProperty: "opacity",
		transitionDuration: transitions.duration.shortest,
		zIndex: 1,
		
		"$dropzone:hover &": {
			opacity: 1
		}
	}
	
}), "EditableAvatar");

const dropzoneClasses = createStyles(({ spacing }) => ({
	
	button: {
		borderRadius: "50%"
	},
	
	icon: {
		width: spacing(4),
		height: spacing(4)
	}
	
}), "EditableAvatarDropzone");


export class EditableAvatar extends Component {
	
	#handleEditPointerDown = event =>
		!event.button &&
		this.props.person.avatarUrl &&
		this.#menu?.open({ event });
	
	#handleEditClick = () =>
		!this.props.person.avatarUrl &&
		this.props.dialog?.open({ person: this.props.person, openFileDialog: true });
	
	#handleFile = file => this.props.dialog?.open({ person: this.props.person, file });
	
	#menu;
	#menuProps = {
		anchorOrigin: { horizontal: "center", vertical: "center" },
		transformOrigin: { horizontal: "center", vertical: "bottom" },
		ref: menu => (this.#menu = menu)
	};
	
	#handleMenuNewClick = () => this.props.dialog.open({ person: this.props.person, openFileDialog: true });
	
	#handleMenuDeleteClick = async () => {
		
		const { self, deletePhotoConfirmMessage, deleteUsersPhotoConfirmMessage, ws, person } = this.props;
		
		confirm(`${self ? deletePhotoConfirmMessage : deleteUsersPhotoConfirmMessage}?`) &&
		
		await ws.sendRequest("users.avatars.delete", person._id);
		
	};
	
	
	render() {
		
		const { className, size, person, online, editable, disablePortal, uploadNewPhotoLabel, deleteLabel } = this.props;
		
		return (
			<Dropzone
				className={clsx(classes.dropzone, className)}
				classes={dropzoneClasses}
				onFile={this.#handleFile}
				disabled={!editable}
			>
				<Avatar
					disableAutoUpdate
					for={person}
					size={size}
					tooltip={false}
					online={online}
				/>
				
				{editable && (
					<>
						<IconButton
							className={classes.edit}
							onClick={this.#handleEditClick}
							onPointerDown={this.#handleEditPointerDown}
						>
							<EditIcon />
						</IconButton>
						
						<ContextMenu {...this.#menuProps} disablePortal={disablePortal}>
							<ContextMenuItem onClick={this.#handleMenuNewClick}>
								{uploadNewPhotoLabel}…
							</ContextMenuItem>
							
							{person.avatarUrl && (
								<ContextMenuItem onClick={this.#handleMenuDeleteClick}>
									{deleteLabel}…
								</ContextMenuItem>
							)}
						</ContextMenu>
					</>
				)}
			</Dropzone>
		);
	}
	
	
	static defaultProps = {
		uploadNewPhotoLabel: "Upload new photo",
		deleteLabel: "Delete",
		deletePhotoConfirmMessage: "Delete photo",
		deleteUsersPhotoConfirmMessage: "Delete user's photo"
	};
	
}
