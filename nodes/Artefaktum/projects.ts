import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest, type Api } from './transport';

export interface ProjectLocator {
	mode: 'list' | 'slug' | 'id';
	value: string;
}

interface Project {
	id: string;
	name: string;
	slug: string;
}

async function listProjects(ctx: Api): Promise<Project[]> {
	const res = await apiRequest(ctx, 'GET', '/v1/projects');
	return ((res.items as IDataObject[] | undefined) ?? []) as unknown as Project[];
}

/** Turn the project locator into a project id, listing projects at most once per execution. */
export async function resolveProjectId(ctx: Api, locator: ProjectLocator, cache: Map<string, string>, itemIndex: number): Promise<string> {
	const value = (locator.value ?? '').trim();
	// 'list' mode comes from the resource locator's search dropdown, whose value is
	// already the project id (see searchProjects below); 'id' mode is manual entry of an id.
	if (locator.mode === 'id' || locator.mode === 'list') return value;
	if (value === '') throw new NodeOperationError(ctx.getNode(), "Parameter 'Project' is empty", { itemIndex });
	if (!cache.size) {
		for (const p of await listProjects(ctx)) {
			cache.set(p.slug, p.id);
			cache.set(p.id, p.id);
		}
	}
	const id = cache.get(value);
	if (!id) {
		throw new NodeOperationError(
			ctx.getNode(),
			`Project '${value}' was not found. Create it in the console (https://artefaktum.dev/console/projects/) or pick one from the list.`,
			{ itemIndex },
		);
	}
	return id;
}

export async function searchProjects(ctx: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	const needle = (filter ?? '').toLowerCase();
	const results = (await listProjects(ctx))
		.filter((p) => !needle || p.name.toLowerCase().includes(needle) || p.slug.toLowerCase().includes(needle))
		.map((p) => ({ name: `${p.name} (${p.slug})`, value: p.id }));
	return { results };
}
