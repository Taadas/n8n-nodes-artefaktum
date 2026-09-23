import { describe, expect, it } from 'vitest';
import { NodeApiError } from 'n8n-workflow';
import { apiRequest, storageRequest } from '../nodes/Artefaktum/transport';
import { mockExecute, on } from './helpers/mockExecute';

describe('apiRequest', () => {
	it('prefixes the base url, sends json and returns the body', async () => {
		const { ctx, calls } = mockExecute({ responses: [on('GET', '/v1/projects', { body: { items: [] } })] });
		const out = await apiRequest(ctx, 'GET', '/v1/projects');
		expect(out).toEqual({ items: [] });
		expect(calls[0]).toMatchObject({ auth: true, method: 'GET', url: 'https://api.test/v1/projects' });
	});

	it('strips a trailing slash from the base url', async () => {
		const { ctx, calls } = mockExecute({
			credentials: { apiKey: 'k', baseUrl: 'https://api.test/' },
			responses: [on('GET', '/v1/projects', { body: {} })],
		});
		await apiRequest(ctx, 'GET', '/v1/projects');
		expect(calls[0].url).toBe('https://api.test/v1/projects');
	});

	it('turns a problem+json answer into a NodeApiError carrying the detail', async () => {
		const { ctx } = mockExecute({
			responses: [on('POST', '/v1/artifacts/uploads', { statusCode: 413, body: { code: 'quota_exceeded', title: 'Quota exceeded', detail: 'storage quota reached: 5 of 5 bytes used', status: 413 } })],
		});
		const err = await apiRequest(ctx, 'POST', '/v1/artifacts/uploads', { body: {}, itemIndex: 2 }).catch((e) => e);
		expect(err).toBeInstanceOf(NodeApiError);
		expect(err.message).toContain('storage quota reached');
		expect(err.description).toContain('quota_exceeded');
	});

	it('handles a non-json error body', async () => {
		const { ctx } = mockExecute({ responses: [on('GET', '/v1/x', { statusCode: 502, body: '<html>bad gateway</html>' })] });
		const err = await apiRequest(ctx, 'GET', '/v1/x').catch((e) => e);
		expect(err).toBeInstanceOf(NodeApiError);
		expect(err.message).toContain('502');
	});

	it('returns an empty object for 202/204 without a body', async () => {
		const { ctx } = mockExecute({ responses: [on('DELETE', '/v1/artifacts/a1', { statusCode: 202, body: undefined })] });
		expect(await apiRequest(ctx, 'DELETE', '/v1/artifacts/a1')).toEqual({});
	});
});

describe('storageRequest', () => {
	const instructions = { method: 'PUT', url: 'https://r2.test/signed?sig=1', headers: { 'content-type': 'text/plain', 'x-amz-meta-a': 'b' }, expires_at: '2030-01-01T00:00:00Z' };

	it('sends only the signed headers, never auth', async () => {
		const { ctx, calls } = mockExecute({ responses: [on('PUT', 'r2.test', { statusCode: 200, body: '' })] });
		await storageRequest(ctx, instructions, { body: Buffer.from('hi') });
		expect(calls[0].auth).toBe(false);
		expect(calls[0].headers).toEqual({ 'content-type': 'text/plain', 'x-amz-meta-a': 'b', 'content-length': '2' });
		expect(calls[0].body).toEqual(Buffer.from('hi'));
	});

	it('returns a Buffer for a GET', async () => {
		const { ctx } = mockExecute({ responses: [on('GET', 'r2.test', { body: 'payload' })] });
		const out = await storageRequest(ctx, { ...instructions, method: 'GET', headers: {} });
		expect(Buffer.isBuffer(out)).toBe(true);
		expect(out.toString()).toBe('payload');
	});

	it('reports a storage failure as a NodeApiError', async () => {
		const { ctx } = mockExecute({ responses: [on('PUT', 'r2.test', { statusCode: 403, body: 'SignatureDoesNotMatch' })] });
		const err = await storageRequest(ctx, instructions, { body: Buffer.from('x') }).catch((e) => e);
		expect(err).toBeInstanceOf(NodeApiError);
		expect(err.message).toContain('403');
	});
});
