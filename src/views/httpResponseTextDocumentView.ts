import * as vscode from 'vscode';
import { SelectedQuery } from './../utils/selector';

// tslint:disable-next-line:ordered-imports
import { Position, Range, TextDocument, ViewColumn, window, workspace, TextEditor } from 'vscode';
import { RestClientSettings } from '../models/configurationSettings';


export class HttpResponseTextDocumentView {

    private readonly settings: RestClientSettings = RestClientSettings.Instance;


    public constructor() {

    }

    public async render(response: SelectedQuery, column?: ViewColumn) {
        const content = response.text; // this.getTextDocumentContent(response);
        const language = "json"; // this.getVSCodeDocumentLanguageId(response);
        const sds = { viewColumn: column, preserveFocus: !this.settings.previewResponsePanelTakeFocus, preview: false }

        let document: TextDocument;
        const uri: vscode.Uri = vscode.Uri.parse("untitled:Response" + '.' + language);
        let editor: TextEditor;
        const docs = workspace.textDocuments;
        document = docs.find(x => x.fileName.endsWith(`Response.${language}`)) as TextDocument;
        // if (!document) {
            document = await workspace.openTextDocument(uri);
            editor = await window.showTextDocument(document, sds);
        // } else {

        //     languages.setTextDocumentLanguage(document, language);
        //     editor = await window.showTextDocument(document, sds);
        // }
        editor.edit(edit => {
            const startPosition = new Position(0, 0);
            const endPosition = document.lineAt(document.lineCount - 1).range.end;
            edit.replace(new Range(startPosition, endPosition), content);
        });
    }

}