import { describe, expect, it } from 'vitest';
import { resolveProjectId } from '../nodes/Artefaktum/projects';
import { mockExecute, on } from './helpers/mockExecute';

const projects = { items: [{ id: 'p-default', name: 'default', slug: 'default', created_at: '' }, { id: 'p-2', name: 'Research', slug: 'research', created_at: '' }] };

describe('resolveProjectId', () => {
	it('passes an id through without a request', async () => {
		const { ctx, calls } = mockExecute({ responses: [] });
		expect(await resolveProjectId(ctx, { mode: 'id', value: 'p-9' }, new Map(), 0)).toBe('p-9');
		expect(calls).toHaveLength(0);
	});

	it('resolves a slug and caches the listing for the execution', async () => {
		const { ctx, calls } = mockExecute({ responses: [on('GET', '/v1/projects', { body: projects })] });
		const cache = new Map<string, string>();
		expect(await resolveProjectId(ctx, { mode: 'slug', value: 'research' }, cache, 0)).toBe('p-2');
		expect(await resolveProjectId(ctx, { mode: 'slug', value: 'default' }, cache, 1)).toBe('p-default');
		expect(calls).toHaveLength(1);
	});

	it('accepts a list-mode value that is already an id', async () => {
		const { ctx, calls } = mockExecute({ responses: [] });
		expect(await resolveProjectId(ctx, { mode: 'list', value: 'p-2' }, new Map(), 0)).toBe('p-2');
		expect(calls).toHaveLength(0);
	});

	it('names the missing project and where to create it', async () => {
		const { ctx } = mockExecute({ responses: [on('GET', '/v1/projects', { body: projects })] });
		const err = await resolveProjectId(ctx, { mode: 'slug', value: 'nope' }, new Map(), 3).catch((e) => e);
		expect(err.message).toContain("'nope'");
		expect(err.message).toContain('console');
	});
});
