import { describe, expect, it } from 'vitest';
import download from '../nodes/Artefaktum/actions/artifact/download';
import { mockExecute, on } from './helpers/mockExecute';

const sha = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'; // sha256("abc")
const artifact = { id: 'a1', title: 'T', status: 'ready', latest_version: { id: 'v1', content_type: 'text/plain', original_filename: 'abc.txt', sha256: sha, size_bytes: 3 } };
const dl = { url: 'https://r2.test/get?sig', method: 'GET', expires_at: '2030-01-01T00:00:00Z', version_id: 'v1' };

describe('artifact:download', () => {
	it('puts verified bytes into the binary property and the artifact into json', async () => {
		const { ctx, calls } = mockExecute({
			params: { artifactId: 'a1', downloadOptions: {} },
			responses: [on('GET', '/v1/artifacts/a1', { body: artifact }), on('GET', '/v1/artifacts/a1/download', { body: dl }), on('GET', 'r2.test', { body: 'abc' })],
		});
		const [item] = await download({ ctx, itemIndex: 0, projectCache: new Map() });
		expect(item.json).toEqual(artifact);
		expect(item.binary?.data).toMatchObject({ fileName: 'abc.txt', mimeType: 'text/plain' });
		expect(Buffer.from(item.binary!.data.data, 'base64').toString()).toBe('abc');
		expect(calls[1].qs).toBeUndefined();
	});

	it('requests a specific version and honours the field name and file name options', async () => {
		const { ctx, calls } = mockExecute({
			params: { artifactId: 'a1', downloadOptions: { versionId: 'v0', binaryPropertyName: 'file', fileName: 'renamed.txt', verifyChecksum: false } },
			responses: [on('GET', '/v1/artifacts/a1', { body: artifact }), on('GET', '/v1/artifacts/a1/download', { body: { ...dl, version_id: 'v0' } }), on('GET', 'r2.test', { body: 'zzz' })],
		});
		const [item] = await download({ ctx, itemIndex: 0, projectCache: new Map() });
		expect(calls[1].qs).toEqual({ version_id: 'v0' });
		expect(item.binary?.file?.fileName).toBe('renamed.txt');
	});

	it('fails on a checksum mismatch', async () => {
		const { ctx } = mockExecute({
			params: { artifactId: 'a1', downloadOptions: {} },
			responses: [on('GET', '/v1/artifacts/a1', { body: artifact }), on('GET', '/v1/artifacts/a1/download', { body: dl }), on('GET', 'r2.test', { body: 'abd' })],
		});
		await expect(download({ ctx, itemIndex: 0, projectCache: new Map() })).rejects.toThrow(/checksum/i);
	});
});
