import { OrgDetails } from "./OrgDetails";
import { UserDetails } from "./UserDetails";


/* eslint-disable react/destructuring-assignment */


export function Details(props) {
	return props.for?.isOrg ? (
		<OrgDetails {...props} />
	) : (
		<UserDetails {...props} />
	);
}
