import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class Artefaktum implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Artefaktum',
		name: 'artefaktum',
		icon: { light: 'file:artefaktum.svg', dark: 'file:artefaktum.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Store, find and reuse artifacts',
		defaults: { name: 'Artefaktum' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'artefaktumApi', required: true }],
		properties: [],
	};
}
