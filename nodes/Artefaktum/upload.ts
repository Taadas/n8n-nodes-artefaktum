import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { sha256Hex, type Content } from './content';
import { apiRequest, storageRequest, type UploadInstructions } from './transport';

/** Second and third steps of every upload: PUT to the signed URL, then complete. */
export async function putAndComplete(
	ctx: IExecuteFunctions,
	artifactId: string,
	versionId: string,
	upload: UploadInstructions,
	content: Content,
	itemIndex: number,
): Promise<IDataObject> {
	await storageRequest(ctx, upload, { body: content.bytes, itemIndex });
	await apiRequest(ctx, 'POST', `/v1/artifacts/${artifactId}/versions/${versionId}/complete`, {
		body: { sha256: sha256Hex(content.bytes), size_bytes: content.bytes.length },
		itemIndex,
	});
	return apiRequest(ctx, 'GET', `/v1/artifacts/${artifactId}`, { itemIndex });
}
