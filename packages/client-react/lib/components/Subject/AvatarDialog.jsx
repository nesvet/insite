import AvatarEditor from "react-avatar-editor";
import { clsx } from "clsx";
import { Dialog } from "@nesvet/missing-mui4-components/Dialog";
import { Dropzone } from "@nesvet/missing-mui4-components/Dropzone";
import { LoadingButton } from "@nesvet/missing-mui4-components/LoadingButton";
import Button from "@material-ui/core/esm/Button";
import Grid from "@material-ui/core/esm/Grid";
import IconButton from "@material-ui/core/esm/IconButton";
import Slider from "@material-ui/core/esm/Slider";
import RotateLeftIcon from "@material-ui/icons/esm/RotateLeft";
import RotateRightIcon from "@material-ui/icons/esm/RotateRight";
import ZoomInIcon from "@material-ui/icons/esm/ZoomIn";
import ZoomOutIcon from "@material-ui/icons/esm/ZoomOut";
import { createStyles, theme } from "$styles";
import { Avatar } from "./Avatar";


const classes = createStyles(({ spacing, palette, alpha }) => ({
	
	title: {
		background: "transparent",
		backdropFilter: "none"
	},
	
	dropzone: {
		minHeight: spacing(37.5)
	},
	
	editor: {
		position: "relative",
		margin: [ -spacing(38), -spacing(3), -spacing(38) ],
		verticalAlign: "middle"
	},
	
	previewLayout: {
		marginBottom: spacing(2),
		zIndex: 1
	},
	
	previewWrapper: {
		flex: "0 0 auto",
		display: "flex",
		borderRadius: "50%",
		overflow: "hidden"
	},
	
	...Object.fromEntries(Object.entries(Avatar.borders).map(([ key, value ]) => [ `previewWrapper-${key}`, {
		outline: `${value}px solid ${alpha(palette.text.primary, .125)}`,
		outlineOffset: -value
	} ])),
	
	rotateSliderLayout: {
		marginBottom: -spacing(1)
	},
	
	actions: {
		marginTop: spacing(.5),
		background: "transparent",
		backdropFilter: "none"
	},
	
	actionsSpace: {
		flexGrow: 1
	}
	
}), "AvatarDialog");

function hexToRgb(hex) {
	return (
		/^#?[\da-f]{6}$/.test(hex) ?
			hex.match(/[\da-f]{2}/gi) :
			/^#?[\da-f]{3}$/.test(hex) ?
				hex.match(/[\da-f]/gi).map(c => c + c) :
				null
	)?.map(c => Number.parseInt(c, 16));
}

const sizesEntries = Object.entries(Avatar.sizes);


export class AvatarDialog extends Dialog {
	constructor(props) {
		super(props, {
			person: null,
			file: null,
			scale: 1,
			rotate: 0,
			position: { x: .5, y: .5 },
			isPending: false
		});
		
	}
	
	title = this.props.title;
	
	getSubtitle = () => this.props.showName !== false && this.state.person?.displayLabel;
	
	classes = {
		title: classes.title,
		actions: classes.actions
	};
	
	handleOpenState = ({ person, file = null }) => ({ person, file });
	
	#shouldOpenFileDialog = false;
	onOpen = ({ openFileDialog }) => openFileDialog && (this.#shouldOpenFileDialog = true);
	
	#typesAccepted = [
		"image/jpeg",
		"image/png",
		"image/apng",
		"image/vnd.mozilla.apng",
		"image/webp",
		"image/gif",
		"image/bmp",
		"image/svg+xml",
		"image/vnd.microsoft.icon",
		"image/x-icon"
	];
	
	#handleDropzoneRef = dropzone => (this.dropzone = dropzone);
	
	handleFile = file =>
		this.setState({
			file,
			scale: 1,
			rotate: 0
		});
	
	size = theme.spacing(32);
	
	scaleMin = 1;
	scaleButtonStep = .15;
	scaleSliderStep = .01;
	scaleMax = 4;
	
	rotateMin = 0;
	rotateButtonStep = 2;
	rotateSliderStep = .1;
	rotateMax = 360;
	
	border = [ theme.spacing(21.5), theme.spacing(39) ];
	color = [ ...hexToRgb(theme.palette.background.paper), .9 ];
	
	quality = .92;
	
	handleScaleChange = (_, scale) => this.setState({ scale });
	handleRotateChange = (_, rotate) => this.setState({ rotate });
	handlePositionChange = position => this.setState({ position });
	
	handleScaleDownClick = () => this.setState({ scale: Math.max(this.scaleMin, this.state.scale - this.scaleButtonStep) });
	handleScaleUpClick = () => this.setState({ scale: Math.min(this.scaleMax, this.state.scale + this.scaleButtonStep) });
	handleRotateLeftClick = () => this.setState({ rotate: Math.max(this.rotateMin, this.state.rotate - this.rotateButtonStep) });
	handleRotateRightClick = () => this.setState({ rotate: Math.min(this.rotateMax, this.state.rotate + this.rotateButtonStep) });
	
	#wheelRafHandle;
	#wheelEvent;
	#handleWheelRaf = () => {
		
		const event = this.#wheelEvent;
		
		this.#wheelEvent = undefined;
		this.#wheelRafHandle = undefined;
		
		const k = 2 ** (-event.deltaY * (event.deltaMode ? 50 : 1) / 500);
		
		this.setState({ scale: Math.min(Math.max(this.state.scale * k, this.scaleMin), this.scaleMax) });
		
	};
	
	#handleWheel = event => {
		
		if (this.#wheelRafHandle)
			cancelAnimationFrame(this.#wheelRafHandle);
		
		this.#wheelEvent = event;
		this.#wheelRafHandle = requestAnimationFrame(this.#handleWheelRaf);
		
	};
	
	handleEditorRef = editor => (this.editor = editor);
	
	handleConfirmClick = () => {
		
		this.setState({ isPending: true });
		
		this.props.ws.transfer(this.props.transferKind, {
			metadata: { _id: this.state.person._id },
			data: this.editor.getImageScaledToCanvas().toDataURL("image/webp", this.quality),
			collect: true,
			onEnd: () => {
				
				this.props.onChange?.();
				
				this.close();
				
			},
			onError: () => this.setState({ isPending: false })
		});
		
	};
	
	openFileDialog = () => {
		
		this.#shouldOpenFileDialog = false;
		
		this.dropzone.inputFileNode.click();
		
	};
	
	
	renderContent() {
		
		const { file, rotate, scale, position } = this.state;
		
		return (
			<Dropzone
				className={classes.dropzone}
				types={this.#typesAccepted}
				onFile={this.handleFile}
				ref={this.#handleDropzoneRef}
			>
				{file ? (
					<Grid
						alignItems="stretch"
						container
						direction="column"
						spacing={0}
					>
						
						<Grid container item>
							<AvatarEditor
								className={classes.editor}
								border={this.border}
								borderRadius={this.size / 2}
								color={this.color}
								height={this.size}
								image={file}
								position={position}
								rotate={rotate}
								scale={scale}
								width={this.size}
								onPositionChange={this.handlePositionChange}
								onWheel={this.#handleWheel}
								ref={this.handleEditorRef}
							/>
						</Grid>
						
						<Grid
							className={classes.previewLayout}
							alignItems="center"
							container
							item
							justifyContent="space-evenly"
						>
							{sizesEntries.map(([ key, size ]) => (
								<div className={clsx(classes.previewWrapper, classes[`previewWrapper-${key}`])} key={size}>
									<AvatarEditor
										border={0}
										height={size}
										image={file}
										position={position}
										rotate={rotate}
										scale={scale}
										width={size}
										onPositionChange={this.handlePositionChange}
										onWheel={this.#handleWheel}
									/>
								</div>
							))}
						</Grid>
						
						<Grid
							alignItems="center"
							container
							item
							spacing={1}
						>
							<Grid item>
								<IconButton onClick={this.handleScaleDownClick} disabled={scale === this.scaleMin}>
									<ZoomOutIcon />
								</IconButton>
							</Grid>
							<Grid item xs>
								<Slider
									value={scale}
									max={this.scaleMax}
									min={this.scaleMin}
									step={this.scaleSliderStep}
									onChange={this.handleScaleChange}
								/>
							</Grid>
							<Grid item>
								<IconButton onClick={this.handleScaleUpClick} disabled={scale === this.scaleMax}>
									<ZoomInIcon />
								</IconButton>
							</Grid>
						</Grid>
						
						<Grid
							className={classes.rotateSliderLayout}
							alignItems="center"
							container
							item
							spacing={1}
						>
							<Grid item>
								<IconButton onClick={this.handleRotateLeftClick} disabled={rotate === this.rotateMin}>
									<RotateLeftIcon />
								</IconButton>
							</Grid>
							<Grid item xs>
								<Slider
									value={rotate}
									max={this.rotateMax}
									min={this.rotateMin}
									step={this.rotateSliderStep}
									onChange={this.handleRotateChange}
								/>
							</Grid>
							<Grid item>
								<IconButton onClick={this.handleRotateRightClick} disabled={rotate === this.rotateMax}>
									<RotateRightIcon />
								</IconButton>
							</Grid>
						</Grid>
					</Grid>
				) : null}
			</Dropzone>
		);
	}
	
	closeButtonLabel = this.props.closeButtonLabel;
	
	renderActions() {
		
		const { anotherImageLabel, confirmButtonLabel } = this.props;
		
		const { file, isPending } = this.state;
		
		return (
			<>
				
				{file && (
					<>
						<Button onClick={this.openFileDialog}>
							{anotherImageLabel}
						</Button>
						
						<div className={classes.actionsSpace} />
					</>
				)}
				
				<LoadingButton
					color="primary"
					disableElevation
					pending={isPending}
					variant="contained"
					onClick={this.handleConfirmClick}
					disabled={!file}
				>
					{confirmButtonLabel}
				</LoadingButton>
			
			</>
		);
	}
	
	componentDidUpdate() {
		
		if (this.#shouldOpenFileDialog)
			this.openFileDialog();
		
	}
	
	
	static defaultProps = {
		title: "Avatar",
		closeButtonLabel: "Cancel",
		anotherImageLabel: "Another image",
		confirmButtonLabel: "Save"
	};
	
}
