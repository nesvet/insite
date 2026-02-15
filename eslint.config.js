import {
	browser,
	config,
	neutral,
	node
} from "@nesvet/eslint-config";


export default [// eslint-disable-line import/no-default-export
	{ ignores: [ "**/dist/**" ] },
	{ files: [ "packages/{config,server,http,users-server-ws,subscriptions-server,users-server,db}/**" ], ...node[0] },
	{ files: [ "packages/{common,ws-transfers,cookie,ws}/**" ], ...neutral[0] },
	{ files: [ "packages/{users-client,subscriptions-react,subscriptions-client,client,client-react}/**" ], ...browser[0] },
	...config
];
