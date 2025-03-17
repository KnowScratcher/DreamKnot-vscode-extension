import * as vscode from 'vscode';

const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();

const functions = new Array<string>();
// const structs = new Array<string>();
// const classes = new Array<string>();
// const interfaces = new Array<string>();
// const enums = new Array<string>();
// const variables = new Array<string>();
// const labels = new Array<string>();
// const macros = new Array<string>();
const operators = new Array<string>();

const legend = (function() {
	const tokenTypesLegend = [
		'comment', 'string', 'keyword', 'number', 'regexp', 'operator', 'namespace',
		'type', 'struct', 'class', 'interface', 'enum', 'typeParameter', 'function',
		'method', 'decorator', 'macro', 'variable', 'parameter', 'property', 'label'
	];
	tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));

	const tokenModifiersLegend = [
		'declaration', 'documentation', 'readonly', 'static', 'abstract', 'deprecated',
		'modification', 'async'
	];
	tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));

	const functionsLegend = [
		"print"
	]
	functionsLegend.forEach((functionName, index) => functions.push(functionName));

	const operatorsLegend = [
		"=", " ", "(", ")", "/"
	]
	operatorsLegend.forEach((operatorName, index) => operators.push(operatorName));

	return new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'dreamknot', scheme: 'file' }, new DocumentSemanticTokensProvider(), legend));
}

interface IParsedToken {
	line: number;
	startCharacter: number;
	length: number;
	tokenType: string;
	tokenModifiers: string[];
}

class DocumentSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
	async provideDocumentSemanticTokens(document: vscode.TextDocument, _token: vscode.CancellationToken): Promise<vscode.SemanticTokens> {
		const allTokens = this._parseText(document.getText());
		const builder = new vscode.SemanticTokensBuilder();
		allTokens.forEach((token) => {
			builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), this._encodeTokenModifiers(token.tokenModifiers));
		});
		return builder.build();
	}

	private _encodeTokenType(tokenType: string): number {
		if (tokenTypes.has(tokenType)) {
			return tokenTypes.get(tokenType)!;
		} else if (tokenType === 'notInLegend') {
			return tokenTypes.size + 2;
		}
		return 0;
	}

	private _encodeTokenModifiers(strTokenModifiers: string[]): number {
		let result = 0;
		for (const tokenModifier of strTokenModifiers) {
			if (tokenModifiers.has(tokenModifier)) {
				result = result | (1 << tokenModifiers.get(tokenModifier)!);
			} else if (tokenModifier === 'notInLegend') {
				result = result | (1 << tokenModifiers.size + 2);
			}
		}
		return result;
	}

	private _parseText(text: string): IParsedToken[] {
		const r: IParsedToken[] = [];
		const lines = text.split(/\r\n|\r|\n/); // split lines
		for (let i = 0; i < lines.length; i++) { // run for each line
			const line = lines[i];
			let state = 0; // 0 for normal, 1 for operator
			// let currentOffset = 0;
			let pointer = 0;
			let build = "";
			let openOffset = 0;
			let closeOffset = 0;
			let commentMode = false;
			do {
				if (pointer == line.length-1) {
					closeOffset = pointer+1;
					const tokenData = this._parseTextToken(line.substring(openOffset, closeOffset));
					r.push({
						line: i,
						startCharacter: openOffset,
						length: closeOffset - openOffset,
						tokenType: tokenData.tokenType,
						tokenModifiers: tokenData.tokenModifiers
					});
				}else if (state === 0 && !operators.includes(line[pointer])) {
					build += line[pointer];
				}else if (state === 1 && operators.includes(line[pointer])) {
					build += line[pointer];
				}else if (commentMode) {
					build += line[pointer];
				}else if (build.trim().startsWith("//")) {
					commentMode = true;
					build += line[pointer];
				}else {
					closeOffset = pointer;
					const tokenData = this._parseTextToken(line.substring(openOffset, closeOffset));
					r.push({
						line: i,
						startCharacter: openOffset,
						length: closeOffset - openOffset,
						tokenType: tokenData.tokenType,
						tokenModifiers: tokenData.tokenModifiers
					});
					openOffset = pointer;
					build = line[pointer];
					state = (state === 1 ? 0 : 1);
				}
				pointer++;
				// eslint-disable-next-line no-constant-condition
			} while (pointer < line.length);
		}
		return r;
	}

	private _parseTextToken(text: string): { tokenType: string; tokenModifiers: string[]; } {
		if (functions.includes(text.trim().split(".")[0])) {
			const parts = text.split('.');
			return {
				tokenType: 'function',
				tokenModifiers: parts.slice(1)
			};
		}else if (text.trim().startsWith("//")) {

			return {
				tokenType: 'comment',
				tokenModifiers: []
			};
		}else {
			return {
				tokenType: 'string',
				tokenModifiers: []
			};
		}
		
	}
}