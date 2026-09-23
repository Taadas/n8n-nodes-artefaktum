import { NodeOperationError } from 'n8n-workflow';
import { resolveProjectId } from '../../projects';
import { apiRequest } from '../../transport';
import { locator, simplifyArtifact, type Action } from '../common';

const get: Action = async ({ ctx, itemIndex, projectCache }) => {
	const lookup = ctx.getNodeParameter('lookup', itemIndex, 'id') as string;
	const simplify = ctx.getNodeParameter('simplify', itemIndex, true) as boolean;
	if (lookup === 'externalKey') {
		const key = (ctx.getNodeParameter('externalKey', itemIndex) as string).trim();
		if (!key) throw new NodeOperationError(ctx.getNode(), "Parameter 'External Key' is empty", { itemIndex });
		const projectId = await resolveProjectId(ctx, locator(ctx, itemIndex), projectCache, itemIndex);
		const artifact = await apiRequest(ctx, 'GET', `/v1/artifacts/by-external-key/${encodeURIComponent(key)}`, { qs: { project_id: projectId }, itemIndex });
		return [{ json: simplify ? simplifyArtifact(artifact) : artifact, pairedItem: { item: itemIndex } }];
	}
	const id = (ctx.getNodeParameter('artifactId', itemIndex) as string).trim();
	if (!id) throw new NodeOperationError(ctx.getNode(), "Parameter 'Artifact ID' is empty", { itemIndex });
	const artifact = await apiRequest(ctx, 'GET', `/v1/artifacts/${encodeURIComponent(id)}`, { itemIndex });
	return [{ json: simplify ? simplifyArtifact(artifact) : artifact, pairedItem: { item: itemIndex } }];
};

export default get;
