import { describe, expect, it } from 'vitest';
import { artifactFields, artifactOperations, projectLocator } from '../nodes/Artefaktum/descriptions/artifact';
import { projectOperations } from '../nodes/Artefaktum/descriptions/project';

const shownFor = (name: string) => artifactFields.filter((f) => f.name === name).flatMap((f) => (f.displayOptions?.show?.operation as string[]) ?? []);

describe('artifact descriptions', () => {
	it('lists the seven operations with actions naming the resource', () => {
		const ops = (artifactOperations.options as Array<{ value: string; action: string }>).map((o) => o.value);
		// Alphabetized by the option's display name (n8n-nodes-base/node-param-options-type-unsorted-items).
		expect(ops).toEqual(['delete', 'download', 'get', 'getMany', 'getOrUpload', 'update', 'upload']);
		for (const o of artifactOperations.options as Array<{ action: string }>) expect(o.action.toLowerCase()).toContain('artifact');
	});

	it('shows content inputs for upload and getOrUpload only', () => {
		expect(shownFor('inputDataSource').sort()).toEqual(['getOrUpload', 'upload']);
		expect(shownFor('content')).toEqual(['upload', 'getOrUpload']);
	});

	it('requires the external key for getOrUpload', () => {
		const key = artifactFields.find((f) => f.name === 'externalKey' && f.required);
		expect(key?.displayOptions?.show?.operation).toEqual(['getOrUpload']);
	});

	it('hides Summary and Expires In (Hours) for getOrUpload (resolve accepts neither)', () => {
		const uploadOptions = artifactFields.find((f) => f.name === 'uploadOptions')!;
		const options = uploadOptions.options as Array<{ name: string; displayOptions?: { show?: Record<string, unknown> } }>;
		for (const name of ['summary', 'expiresInHours']) {
			const opt = options.find((o) => o.name === name)!;
			expect(opt.displayOptions?.show?.['/operation']).toEqual(['upload']);
		}
	});

	it('project locator defaults to the default slug', () => {
		const p = projectLocator(['upload']);
		expect(p.type).toBe('resourceLocator');
		expect(p.default).toEqual({ mode: 'slug', value: 'default' });
		expect((p.modes ?? []).map((m) => m.name)).toEqual(['list', 'slug', 'id']);
	});

	it('every boolean description starts with Whether', () => {
		const all = [...artifactFields, ...(artifactFields.flatMap((f) => (f.options as Array<{ type?: string; description?: string }> | undefined) ?? []))];
		for (const f of all) if (f.type === 'boolean') expect(f.description ?? '').toMatch(/^Whether /);
	});

	it('project has one operation', () => {
		expect((projectOperations.options as Array<{ value: string }>).map((o) => o.value)).toEqual(['getMany']);
	});
});
