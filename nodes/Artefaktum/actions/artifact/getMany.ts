import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { resolveProjectId } from '../../projects';
import { apiRequest } from '../../transport';
import { locator, splitList, type Action } from '../common';

const RETURN_ALL_CAP = 1000;

const getMany: Action = async ({ ctx, itemIndex, projectCache }) => {
	const projectId = await resolveProjectId(ctx, locator(ctx, itemIndex), projectCache, itemIndex);
	const returnAll = ctx.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const limit = returnAll ? 100 : Math.max(1, Math.min(100, Number(ctx.getNodeParameter('limit', itemIndex, 50))));
	const f = ctx.getNodeParameter('filters', itemIndex, {}) as IDataObject;
	const filters: IDataObject = {};
	const tags = splitList(f.tags);
	if (tags.length) filters.tags_all = tags;
	const types = splitList(f.contentTypes);
	if (types.length) filters.content_types = types;
	if (typeof f.createdAfter === 'string' && f.createdAfter) filters.created_after = f.createdAfter;
	if (typeof f.createdBefore === 'string' && f.createdBefore) filters.created_before = f.createdBefore;
	if (f.includeSuperseded === true) filters.exclude_superseded = false;

	const body: IDataObject = { project_id: projectId, query: ctx.getNodeParameter('query', itemIndex, '') as string, mode: ctx.getNodeParameter('mode', itemIndex, 'hybrid') as string, limit };
	if (Object.keys(filters).length) body.filters = filters;

	const out: INodeExecutionData[] = [];
	let cursor: string | null = null;
	do {
		const page = await apiRequest(ctx, 'POST', '/v1/artifacts/search', { body: cursor ? { ...body, cursor } : body, itemIndex });
		for (const hit of (page.items as IDataObject[]) ?? []) {
			out.push({ json: { ...(hit.artifact as IDataObject), score: hit.score, match_mode: hit.match_mode }, pairedItem: { item: itemIndex } });
			if (!returnAll && out.length >= limit) return out;
			if (returnAll && out.length >= RETURN_ALL_CAP) return out;
		}
		cursor = returnAll && typeof page.next_cursor === 'string' ? page.next_cursor : null;
	} while (cursor);
	return out;
};

export default getMany;
