export function arrayBufferToBase64(arrayBuffer: ArrayBuffer): Promise<string> {
	return new Promise(resolve => {
		
		const fileReader = new FileReader();
		
		// eslint-disable-next-line unicorn/prefer-add-event-listener
		fileReader.onload = () =>
			resolve(typeof fileReader?.result == "string" ? fileReader.result.slice(Math.max(0, fileReader.result.indexOf(",") + 1)) : "");
		
		fileReader.readAsDataURL(new Blob([ arrayBuffer ]));
		
	});
}
