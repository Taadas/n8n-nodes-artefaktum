import { describe, expect, it } from 'vitest';
import del from '../nodes/Artefaktum/actions/artifact/del';
import download from '../nodes/Artefaktum/actions/artifact/download';
import get from '../nodes/Artefaktum/actions/artifact/get';
import update from '../nodes/Artefaktum/actions/artifact/update';
import { mockExecute, on } from './helpers/mockExecute';

// Ids containing characters that are meaningful in a URL path or query string. Each must be
// encoded so the server sees a single opaque path segment, never a second segment or a query.
const IDS = ['a/b', 'a?x=1', 'a#f', 'a b'];

const a = { itemIndex: 0, projectCache: new Map<string, string>() };

describe('artifact id path encoding', () => {
	for (const id of IDS) {
		const encoded = encodeURIComponent(id);

		it(`get (by id) encodes '${id}'`, async () => {
			const { ctx, calls } = mockExecute({
				params: { lookup: 'id', artifactId: id },
				responses: [on('GET', `/v1/artifacts/${encoded}`, { body: { id, status: 'ready' } })],
			});
			await get({ ...a, ctx });
			expect(calls[0].url).toBe(`https://api.test/v1/artifacts/${encoded}`);
			expect(calls[0].qs).toBeUndefined();
		});

		it(`update encodes '${id}'`, async () => {
			const { ctx, calls } = mockExecute({
				params: { artifactId: id, updateFields: { title: 'New' } },
				responses: [on('PATCH', `/v1/artifacts/${encoded}`, { body: { id, title: 'New' } })],
			});
			await update({ ...a, ctx });
			expect(calls[0].url).toBe(`https://api.test/v1/artifacts/${encoded}`);
		});

		it(`delete encodes '${id}'`, async () => {
			const { ctx, calls } = mockExecute({
				params: { artifactId: id },
				responses: [on('DELETE', `/v1/artifacts/${encoded}`, { statusCode: 202, body: undefined })],
			});
			await del({ ...a, ctx });
			expect(calls[0].url).toBe(`https://api.test/v1/artifacts/${encoded}`);
		});

		it(`download encodes '${id}'`, async () => {
			const artifact = { id, status: 'ready', latest_version: { id: 'v1', content_type: 'text/plain', original_filename: 'f.txt', sha256: null } };
			const link = { url: 'https://r2.test/get?sig', method: 'GET', expires_at: '2030-01-01T00:00:00Z', version_id: 'v1' };
			const { ctx, calls } = mockExecute({
				params: { artifactId: id, downloadOptions: {} },
				responses: [
					on('GET', `/v1/artifacts/${encoded}`, { body: artifact }),
					on('GET', `/v1/artifacts/${encoded}/download`, { body: link }),
					on('GET', 'r2.test', { body: 'abc' }),
				],
			});
			await download({ ...a, ctx });
			expect(calls[0].url).toBe(`https://api.test/v1/artifacts/${encoded}`);
			expect(calls[1].url).toBe(`https://api.test/v1/artifacts/${encoded}/download`);
			// Never a second path segment: the encoded id must be the whole segment, so nothing
			// after it except the known '/download' suffix.
			expect(calls[1].url.replace('/download', '')).toBe(calls[0].url);
		});
	}
});
