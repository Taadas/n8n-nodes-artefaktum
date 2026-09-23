import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { sha256Hex } from '../../content';
import { apiRequest, storageRequest } from '../../transport';
import type { Action } from '../common';

const download: Action = async ({ ctx, itemIndex }) => {
	const artifactId = (ctx.getNodeParameter('artifactId', itemIndex) as string).trim();
	if (!artifactId) throw new NodeOperationError(ctx.getNode(), "Parameter 'Artifact ID' is empty", { itemIndex });
	const options = ctx.getNodeParameter('downloadOptions', itemIndex, {}) as IDataObject;
	const property = (options.binaryPropertyName as string) || 'data';
	const verify = options.verifyChecksum !== false;

	const artifact = await apiRequest(ctx, 'GET', `/v1/artifacts/${artifactId}`, { itemIndex });
	const qs: IDataObject = {};
	if (typeof options.versionId === 'string' && options.versionId.trim()) qs.version_id = options.versionId.trim();
	const link = await apiRequest(ctx, 'GET', `/v1/artifacts/${artifactId}/download`, { itemIndex, qs: Object.keys(qs).length ? qs : undefined });
	const bytes = await storageRequest(ctx, { method: String(link.method ?? 'GET'), url: String(link.url), headers: {}, expires_at: String(link.expires_at ?? '') }, { itemIndex });

	const version = (artifact.latest_version as IDataObject | null) ?? {};
	const sameVersion = !qs.version_id || qs.version_id === version.id;
	if (verify && sameVersion && typeof version.sha256 === 'string' && version.sha256) {
		const actual = sha256Hex(bytes);
		if (actual !== version.sha256) throw new NodeOperationError(ctx.getNode(), `Checksum mismatch for artifact ${artifactId}: expected ${version.sha256}, got ${actual}. Run the node again; if it persists, the stored object is damaged.`, { itemIndex });
	}
	const fileName = (typeof options.fileName === 'string' && options.fileName.trim()) || (typeof version.original_filename === 'string' ? version.original_filename : undefined);
	const mimeType = typeof version.content_type === 'string' ? version.content_type : undefined;
	const binary = await ctx.helpers.prepareBinaryData(bytes, fileName, mimeType);
	return [{ json: artifact, binary: { [property]: binary }, pairedItem: { item: itemIndex } }];
};

export default download;
