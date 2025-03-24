// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { SQLFormatter } from './formatter';

export function activate(context: vscode.ExtensionContext) {
	const formatter = new SQLFormatter();

	// 注册选中文本格式化命令
	let formatSelectionCommand = vscode.commands.registerCommand('format-your-sql.formatSelection', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		const selection = editor.selection;
		if (selection.isEmpty) {
			vscode.window.showInformationMessage('Please select some SQL text to format');
			return;
		}

		const text = editor.document.getText(selection);

		try {
			const formatted = formatter.format(text);
			await editor.edit(editBuilder => {
				editBuilder.replace(selection, formatted);
			});
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`SQL formatting error: ${errorMessage}`);
		}
	});

	// 注册格式化命令
	let formatCommand = vscode.commands.registerCommand('format-your-sql.format', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		if (editor.document.languageId !== 'sql') {
			vscode.window.showInformationMessage('This command only works with SQL files');
			return;
		}

		const selection = editor.selection;
		const text = editor.document.getText(selection);

		try {
			const formatted = formatter.format(text);
			await editor.edit(editBuilder => {
				editBuilder.replace(selection, formatted);
			});
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`SQL formatting error: ${errorMessage}`);
		}
	});

	// 注册文档格式化提供程序
	let formattingProvider = vscode.languages.registerDocumentFormattingEditProvider('sql', {
		provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
			try {
				const text = document.getText();
				const formatted = formatter.format(text);
				
				const firstLine = document.lineAt(0);
				const lastLine = document.lineAt(document.lineCount - 1);
				const range = new vscode.Range(
					firstLine.range.start,
					lastLine.range.end
				);
				
				return [vscode.TextEdit.replace(range, formatted)];
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				vscode.window.showErrorMessage(`SQL formatting error: ${errorMessage}`);
				return [];
			}
		}
	});

	context.subscriptions.push(formatSelectionCommand, formatCommand, formattingProvider);
}

// This method is called when your extension is deactivated
export function deactivate() {}
