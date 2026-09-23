import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';
import { readContent } from '../../content';
import { resolveProjectId } from '../../projects';
import { apiRequest, type UploadInstructions } from '../../transport';
import { putAndComplete } from '../../upload';
import { locator, uploadMetadata, type Action } from '../common';

const MAX_PENDING_ROUNDS = 5;

const getOrUpload: Action = async ({ ctx, itemIndex, projectCache }) => {
	const projectId = await resolveProjectId(ctx, locator(ctx, itemIndex), projectCache, itemIndex);
	const externalKey = (ctx.getNodeParameter('externalKey', itemIndex) as string).trim();
	if (!externalKey) throw new NodeOperationError(ctx.getNode(), "Parameter 'External Key' is empty", { itemIndex });
	const maxAge = Number(ctx.getNodeParameter('maxAgeSeconds', itemIndex, 0));
	const content = await readContent(ctx, itemIndex);
	const body: IDataObject = { project_id: projectId, external_key: externalKey, ...uploadMetadata(ctx, itemIndex, content, { externalKey: false }) };
	if (maxAge > 0) body.max_age_seconds = Math.floor(maxAge);

	for (let round = 0; round <= MAX_PENDING_ROUNDS; round++) {
		const res = await apiRequest(ctx, 'POST', '/v1/artifacts/resolve', { body, itemIndex });
		if (res.status === 'hit') return [{ json: { ...(res.artifact as IDataObject), cache: 'hit' }, pairedItem: { item: itemIndex } }];
		if (res.status === 'create') {
			const ref = res.reservation as IDataObject;
			const artifact = await putAndComplete(ctx, String(ref.id), String(ref.version_id), res.upload as unknown as UploadInstructions, content, itemIndex);
			return [{ json: { ...artifact, cache: 'created' }, pairedItem: { item: itemIndex } }];
		}
		if (round < MAX_PENDING_ROUNDS) await sleep(Math.min(Number(res.retry_after_seconds ?? 5), 5) * 1000);
	}
	throw new NodeOperationError(ctx.getNode(), `The artifact under '${externalKey}' is still being uploaded by another run. Try again in a minute.`, { itemIndex });
};

export default getOrUpload;
