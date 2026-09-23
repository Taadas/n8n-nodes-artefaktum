import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ArtefaktumApi implements ICredentialType {
	name = 'artefaktumApi';

	displayName = 'Artefaktum API';

	icon = { light: 'file:../nodes/Artefaktum/artefaktum.svg', dark: 'file:../nodes/Artefaktum/artefaktum.dark.svg' } as const;

	documentationUrl = 'https://github.com/Taadas/n8n-nodes-artefaktum#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'An API key from the Artefaktum console (https://artefaktum.dev/console/)',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.artefaktum.dev',
			description: 'Change only for a self-hosted Artefaktum, without a trailing slash',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}' } },
	};

	test: ICredentialTestRequest = {
		request: { baseURL: '={{$credentials.baseUrl}}', url: '/health/whoami', method: 'GET' },
	};
}
