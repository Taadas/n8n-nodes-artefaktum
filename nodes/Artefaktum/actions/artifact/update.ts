import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { apiRequest } from '../../transport';
import { parseJsonParam, splitList, type Action } from '../common';

const update: Action = async ({ ctx, itemIndex }) => {
	const id = (ctx.getNodeParameter('artifactId', itemIndex) as string).trim();
	if (!id) throw new NodeOperationError(ctx.getNode(), "Parameter 'Artifact ID' is empty", { itemIndex });
	const f = ctx.getNodeParameter('updateFields', itemIndex, {}) as IDataObject;
	const body: IDataObject = {};
	if (typeof f.title === 'string' && f.title.trim()) body.title = f.title.trim();
	if (typeof f.description === 'string' && f.description !== '') body.description = f.description;
	if (f.tags !== undefined && f.tags !== '') body.tags = splitList(f.tags);
	const metadata = parseJsonParam(ctx, f.metadata, 'Metadata (JSON)', itemIndex);
	if (metadata && Object.keys(metadata).length) body.metadata = metadata;
	if (f.clearExpiresAt === true) body.clear_expires_at = true;
	else if (typeof f.expiresAt === 'string' && f.expiresAt) body.expires_at = f.expiresAt;
	if (!Object.keys(body).length) throw new NodeOperationError(ctx.getNode(), "Set at least one field under 'Fields' to update", { itemIndex });
	return [{ json: await apiRequest(ctx, 'PATCH', `/v1/artifacts/${id}`, { body, itemIndex }), pairedItem: { item: itemIndex } }];
};

export default update;
