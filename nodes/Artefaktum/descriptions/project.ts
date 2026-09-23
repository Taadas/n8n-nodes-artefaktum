import type { INodeProperties } from 'n8n-workflow';

export const projectOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['project'] } },
	default: 'getMany',
	options: [{ name: 'Get Many', value: 'getMany', action: 'Get many projects', description: 'List the projects of your tenant' }],
};

export const projectFields: INodeProperties[] = [];
