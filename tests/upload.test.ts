import { describe, expect, it } from 'vitest';
import { putAndComplete } from '../nodes/Artefaktum/upload';
import { mockExecute, on } from './helpers/mockExecute';

const upload = { method: 'PUT', url: 'https://r2.test/obj?sig=1', headers: { 'content-type': 'text/plain' }, expires_at: '2030-01-01T00:00:00Z' };
const artifact = { id: 'a1', title: 't', status: 'processing', latest_version: { id: 'v1', sha256: null } };

describe('putAndComplete', () => {
	it('PUTs the bytes, completes with the digest and size, then fetches the artifact', async () => {
		const { ctx, calls } = mockExecute({
			responses: [
				on('PUT', 'r2.test', { statusCode: 200, body: '' }),
				on('POST', '/v1/artifacts/a1/versions/v1/complete', { body: { id: 'a1', status: 'processing', version_id: 'v1' } }),
				on('GET', '/v1/artifacts/a1', { body: artifact }),
			],
		});
		const out = await putAndComplete(ctx, 'a1', 'v1', upload, { bytes: Buffer.from('abc'), filename: 'f.txt', contentType: 'text/plain' }, 0);
		expect(out).toEqual(artifact);
		expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['PUT https://r2.test/obj?sig=1', 'POST https://api.test/v1/artifacts/a1/versions/v1/complete', 'GET https://api.test/v1/artifacts/a1']);
		expect(calls[1].body).toEqual({ sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', size_bytes: 3 });
	});

	it('does not complete when the PUT fails', async () => {
		const { ctx, calls } = mockExecute({ responses: [on('PUT', 'r2.test', { statusCode: 500, body: 'nope' })] });
		await expect(putAndComplete(ctx, 'a1', 'v1', upload, { bytes: Buffer.from('abc'), filename: 'f', contentType: 'text/plain' }, 0)).rejects.toThrow();
		expect(calls).toHaveLength(1);
	});
});
