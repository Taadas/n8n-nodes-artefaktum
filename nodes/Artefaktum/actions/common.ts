import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Content } from '../content';

export interface ActionContext {
	ctx: IExecuteFunctions;
	itemIndex: number;
	projectCache: Map<string, string>;
}

export type Action = (a: ActionContext) => Promise<INodeExecutionData[]>;

export function splitList(value: unknown): string[] {
	if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
	return String(value ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

export function parseJsonParam(ctx: IExecuteFunctions, value: unknown, displayName: string, itemIndex: number): IDataObject | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value === 'object') return value as IDataObject;
	try {
		const parsed: unknown = JSON.parse(String(value));
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
		return parsed as IDataObject;
	} catch {
		throw new NodeOperationError(ctx.getNode(), `Parameter '${displayName}' must be a JSON object, e.g. {"city": "Vilnius"}`, { itemIndex });
	}
}

/** The metadata half of an upload or resolve body, from the shared upload parameters. */
export function uploadMetadata(ctx: IExecuteFunctions, itemIndex: number, content: Content, opts: { externalKey?: boolean } = {}): IDataObject {
	const title = (ctx.getNodeParameter('title', itemIndex, '') as string).trim() || content.filename;
	const options = ctx.getNodeParameter('uploadOptions', itemIndex, {}) as IDataObject;
	const body: IDataObject = { title, filename: content.filename, content_type: content.contentType, size_bytes: content.bytes.length };
	if (typeof options.description === 'string' && options.description.trim()) body.description = options.description.trim();
	if (typeof options.summary === 'string' && options.summary.trim()) body.summary = options.summary.trim();
	const tags = splitList(options.tags);
	if (tags.length) body.tags = tags;
	const metadata = parseJsonParam(ctx, options.metadata, 'Metadata (JSON)', itemIndex);
	if (metadata && Object.keys(metadata).length) body.metadata = metadata;
	const hours = Number(options.expiresInHours ?? 0);
	if (hours > 0) body.expires_at = new Date(Date.now() + hours * 3600 * 1000).toISOString();
	if (opts.externalKey !== false && typeof options.externalKey === 'string' && options.externalKey.trim()) body.external_key = options.externalKey.trim();
	return body;
}

export function locator(ctx: IExecuteFunctions, itemIndex: number): { mode: 'list' | 'slug' | 'id'; value: string } {
	const raw = ctx.getNodeParameter('project', itemIndex) as { mode?: string; value?: unknown } | string;
	if (typeof raw === 'string') return { mode: 'slug', value: raw };
	return { mode: (raw.mode as 'list' | 'slug' | 'id') ?? 'slug', value: String(raw.value ?? '') };
}
