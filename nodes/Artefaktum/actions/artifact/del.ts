import { NodeOperationError } from 'n8n-workflow';
import { apiRequest } from '../../transport';
import type { Action } from '../common';

const del: Action = async ({ ctx, itemIndex }) => {
	const id = (ctx.getNodeParameter('artifactId', itemIndex) as string).trim();
	if (!id) throw new NodeOperationError(ctx.getNode(), "Parameter 'Artifact ID' is empty", { itemIndex });
	await apiRequest(ctx, 'DELETE', `/v1/artifacts/${encodeURIComponent(id)}`, { itemIndex });
	return [{ json: { id, deleted: true }, pairedItem: { item: itemIndex } }];
};

export default del;
