import type { IExecuteFunctions, INodeExecutionData, IHttpRequestOptions, IBinaryData } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export type RecordedCall = { auth: boolean; method: string; url: string; body?: unknown; headers?: Record<string, string>; qs?: unknown };
export type Reply = { statusCode?: number; body?: unknown; headers?: Record<string, string> };
export type Responder = { match: (call: RecordedCall) => boolean; reply: Reply };

export const on = (method: string, urlPart: string, reply: Reply): Responder => ({
	match: (c) => c.method === method && c.url.includes(urlPart),
	reply,
});

type Params = Record<string, unknown> | ((name: string, itemIndex: number) => unknown);

export function mockExecute(opts: {
	items?: INodeExecutionData[];
	params?: Params;
	responses: Responder[];
	credentials?: { apiKey: string; baseUrl: string };
	continueOnFail?: boolean;
}) {
	const calls: RecordedCall[] = [];
	const items = opts.items ?? [{ json: {} }];
	const credentials = opts.credentials ?? { apiKey: 'ak_test', baseUrl: 'https://api.test' };
	const queue = [...opts.responses];

	const respond = async (call: RecordedCall, options: IHttpRequestOptions) => {
		calls.push(call);
		const idx = queue.findIndex((r) => r.match(call));
		if (idx < 0) throw new Error(`unexpected request ${call.method} ${call.url}`);
		const [{ reply }] = queue.splice(idx, 1);
		const statusCode = reply.statusCode ?? 200;
		let body: unknown = reply.body;
		if (options.encoding === 'arraybuffer' && typeof body === 'string') body = Buffer.from(body);
		if (options.returnFullResponse) return { statusCode, headers: reply.headers ?? {}, body };
		if (statusCode >= 400) throw Object.assign(new Error(`status ${statusCode}`), { statusCode, response: { body } });
		return body;
	};

	const param = (name: string, i: number, fallback?: unknown) => {
		const p = opts.params;
		const v = typeof p === 'function' ? p(name, i) : p?.[name];
		if (v === undefined) {
			if (fallback !== undefined) return fallback;
			throw new Error(`test did not define parameter ${name}`);
		}
		return v;
	};

	const node = { name: 'Artefaktum', type: 'n8n-nodes-artefaktum.artefaktum', typeVersion: 1, position: [0, 0], parameters: {} };

	const ctx = {
		getInputData: () => items,
		getNodeParameter: (name: string, i: number, fallback?: unknown) => param(name, i, fallback),
		getCredentials: async () => credentials,
		continueOnFail: () => opts.continueOnFail ?? false,
		getNode: () => node,
		helpers: {
			httpRequestWithAuthentication: async (_cred: string, options: IHttpRequestOptions) =>
				respond({ auth: true, method: options.method ?? 'GET', url: String(options.url), body: options.body, headers: options.headers as Record<string, string>, qs: options.qs }, options),
			httpRequest: async (options: IHttpRequestOptions) =>
				respond({ auth: false, method: options.method ?? 'GET', url: String(options.url), body: options.body, headers: options.headers as Record<string, string>, qs: options.qs }, options),
			assertBinaryData: (i: number, prop: string): IBinaryData => {
				const b = items[i]?.binary?.[prop];
				if (!b) throw new NodeOperationError(node as never, `This operation expects binary data in property '${prop}' of item ${i}`);
				return b;
			},
			getBinaryDataBuffer: async (i: number, prop: string) => Buffer.from(items[i].binary![prop].data, 'base64'),
			prepareBinaryData: async (buffer: Buffer, fileName?: string, mimeType?: string): Promise<IBinaryData> => ({
				data: buffer.toString('base64'),
				mimeType: mimeType ?? 'application/octet-stream',
				fileName,
				fileSize: `${buffer.length} B`,
			}),
		},
	} as unknown as IExecuteFunctions;

	return { ctx, calls, node, NodeApiError };
}
