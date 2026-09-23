import type { IDataObject } from 'n8n-workflow';
import { apiRequest } from '../../transport';
import type { Action } from '../common';

const getMany: Action = async ({ ctx, itemIndex }) => {
	const res = await apiRequest(ctx, 'GET', '/v1/projects', { itemIndex });
	return (((res.items as IDataObject[]) ?? [])).map((p) => ({ json: p, pairedItem: { item: itemIndex } }));
};

export default getMany;
