import type { IDataObject, IExecuteFunctions, IHttpRequestMethods, IHttpRequestOptions, ILoadOptionsFunctions, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export type Api = IExecuteFunctions | ILoadOptionsFunctions;

export interface UploadInstructions {
	method: string;
	url: string;
	headers: Record<string, string>;
	expires_at: string;
}

interface FullResponse {
	statusCode: number;
	headers: Record<string, string>;
	body: unknown;
}

async function baseUrl(ctx: Api): Promise<string> {
	const credentials = (await ctx.getCredentials('artefaktumApi')) as { baseUrl?: string };
	return (credentials.baseUrl ?? 'https://api.artefaktum.dev').replace(/\/+$/, '');
}

function problemMessage(statusCode: number, body: unknown): { message: string; description: string } {
	if (body && typeof body === 'object') {
		const p = body as { detail?: unknown; title?: unknown; code?: unknown };
		const detail = typeof p.detail === 'string' ? p.detail : typeof p.title === 'string' ? p.title : `Artefaktum answered ${statusCode}`;
		const code = typeof p.code === 'string' ? p.code : 'http_error';
		return { message: detail, description: `${code} (HTTP ${statusCode})` };
	}
	return { message: `Artefaktum answered HTTP ${statusCode}`, description: typeof body === 'string' ? body.slice(0, 200) : `HTTP ${statusCode}` };
}

/** One authenticated call to the Artefaktum API. Non-2xx becomes a NodeApiError. */
export async function apiRequest(
	ctx: Api,
	method: IHttpRequestMethods,
	path: string,
	opts: { body?: IDataObject; qs?: IDataObject; itemIndex?: number } = {},
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		url: `${await baseUrl(ctx)}${path}`,
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};
	if (opts.body !== undefined) options.body = opts.body;
	if (opts.qs !== undefined) options.qs = opts.qs;
	const res = (await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'artefaktumApi', options)) as FullResponse;
	if (res.statusCode >= 400) {
		const { message, description } = problemMessage(res.statusCode, res.body);
		throw new NodeApiError(ctx.getNode(), (res.body ?? {}) as JsonObject, { message, description, httpCode: String(res.statusCode), itemIndex: opts.itemIndex });
	}
	if (res.body === undefined || res.body === null || res.body === '') return {};
	return res.body as IDataObject;
}

/** A signed-URL request to object storage: exactly the instructions' headers, no auth. */
export async function storageRequest(
	ctx: Api,
	instructions: UploadInstructions,
	opts: { body?: Buffer; itemIndex?: number } = {},
): Promise<Buffer> {
	const headers: Record<string, string> = { ...instructions.headers };
	const options: IHttpRequestOptions = {
		method: instructions.method as IHttpRequestMethods,
		url: instructions.url,
		headers,
		json: false,
		encoding: 'arraybuffer',
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};
	if (opts.body !== undefined) {
		headers['content-length'] = String(opts.body.length);
		options.body = opts.body;
	}
	const res = (await ctx.helpers.httpRequest(options)) as FullResponse;
	if (res.statusCode >= 400) {
		const text = Buffer.isBuffer(res.body) ? res.body.toString('utf8', 0, 200) : String(res.body ?? '').slice(0, 200);
		throw new NodeApiError(ctx.getNode(), { statusCode: res.statusCode, body: text } as JsonObject, {
			message: `Object storage answered HTTP ${res.statusCode} for the signed ${instructions.method}`,
			description: text || 'The signed URL may have expired; run the node again.',
			httpCode: String(res.statusCode),
			itemIndex: opts.itemIndex,
		});
	}
	if (Buffer.isBuffer(res.body)) return res.body;
	if (res.body === undefined || res.body === null) return Buffer.alloc(0);
	if (typeof res.body === 'string') return Buffer.from(res.body);
	return Buffer.from(res.body as ArrayBuffer);
}
