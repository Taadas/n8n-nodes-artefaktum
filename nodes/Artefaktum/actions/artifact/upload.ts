import type { IDataObject } from 'n8n-workflow';
import { readContent } from '../../content';
import { resolveProjectId } from '../../projects';
import { apiRequest, type UploadInstructions } from '../../transport';
import { putAndComplete } from '../../upload';
import { locator, uploadMetadata, type Action } from '../common';

const upload: Action = async ({ ctx, itemIndex, projectCache }) => {
	const projectId = await resolveProjectId(ctx, locator(ctx, itemIndex), projectCache, itemIndex);
	const content = await readContent(ctx, itemIndex);
	const body = { project_id: projectId, ...uploadMetadata(ctx, itemIndex, content) };
	const ticket = await apiRequest(ctx, 'POST', '/v1/artifacts/uploads', { body, itemIndex });
	const ref = ticket.artifact as IDataObject;
	const artifact = await putAndComplete(ctx, String(ref.id), String(ref.version_id), ticket.upload as unknown as UploadInstructions, content, itemIndex);
	return [{ json: artifact, pairedItem: { item: itemIndex } }];
};

export default upload;
