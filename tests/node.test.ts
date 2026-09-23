import { describe, expect, it } from 'vitest';
import { Artefaktum } from '../nodes/Artefaktum/Artefaktum.node';
import { mockExecute, on } from './helpers/mockExecute';

const projects = { items: [{ id: 'p1', name: 'default', slug: 'default' }] };

describe('Artefaktum node', () => {
	it('declares the credential, both resources and is usable as a tool', () => {
		const d = new Artefaktum().description;
		expect(d.credentials).toEqual([{ name: 'artefaktumApi', required: true }]);
		expect(d.usableAsTool).toBe(true);
		const resource = d.properties.find((p) => p.name === 'resource')!;
		expect((resource.options as Array<{ value: string }>).map((o) => o.value)).toEqual(['artifact', 'project']);
	});

	it('dispatches per item and pairs outputs', async () => {
		const { ctx } = mockExecute({
			items: [{ json: { n: 1 } }, { json: { n: 2 } }],
			params: { resource: 'project', operation: 'getMany' },
			responses: [on('GET', '/v1/projects', { body: projects }), on('GET', '/v1/projects', { body: projects })],
		});
		const [out] = await new Artefaktum().execute.call(ctx);
		expect(out.map((o) => o.pairedItem)).toEqual([{ item: 0 }, { item: 1 }]);
	});

	it('continues on fail with the API message in the item', async () => {
		const { ctx } = mockExecute({
			items: [{ json: {} }, { json: {} }],
			params: (name, i) => ({ resource: 'artifact', operation: 'delete', artifactId: i === 0 ? 'missing' : 'a2' })[name],
			responses: [
				on('DELETE', '/v1/artifacts/missing', { statusCode: 404, body: { code: 'artifact_not_found', detail: 'no artifact missing', status: 404 } }),
				on('DELETE', '/v1/artifacts/a2', { statusCode: 202, body: undefined }),
			],
			continueOnFail: true,
		});
		const [out] = await new Artefaktum().execute.call(ctx);
		expect(out[0].json).toEqual({ error: 'no artifact missing' });
		expect(out[1].json).toEqual({ id: 'a2', deleted: true });
	});

	it('throws the API error when not continuing on fail', async () => {
		const { ctx } = mockExecute({
			params: { resource: 'artifact', operation: 'delete', artifactId: 'missing' },
			responses: [on('DELETE', '/v1/artifacts/missing', { statusCode: 404, body: { detail: 'no artifact missing' } })],
		});
		await expect(new Artefaktum().execute.call(ctx)).rejects.toThrow('no artifact missing');
	});

	it('rejects an unknown operation clearly', async () => {
		const { ctx } = mockExecute({ params: { resource: 'artifact', operation: 'fly' }, responses: [] });
		await expect(new Artefaktum().execute.call(ctx)).rejects.toThrow(/not supported/);
	});
});
