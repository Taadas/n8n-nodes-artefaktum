import { describe, expect, it } from 'vitest';
import { ArtefaktumApi } from '../credentials/ArtefaktumApi.credentials';

describe('ArtefaktumApi credential', () => {
	const cred = new ArtefaktumApi();

	it('is named for the node and hides the key', () => {
		expect(cred.name).toBe('artefaktumApi');
		expect(cred.displayName).toBe('Artefaktum API');
		const apiKey = cred.properties.find((p) => p.name === 'apiKey');
		expect(apiKey?.typeOptions?.password).toBe(true);
		expect(apiKey?.required).toBe(true);
	});

	it('defaults the base URL to the hosted API', () => {
		const baseUrl = cred.properties.find((p) => p.name === 'baseUrl');
		expect(baseUrl?.default).toBe('https://api.artefaktum.dev');
	});

	it('authenticates with a bearer header and tests against whoami', () => {
		expect(cred.authenticate).toEqual({
			type: 'generic',
			properties: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}' } },
		});
		expect(cred.test.request).toEqual({ baseURL: '={{$credentials.baseUrl}}', url: '/health/whoami', method: 'GET' });
	});
});
