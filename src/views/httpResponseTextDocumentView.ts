import * as vscode from 'vscode';

// tslint:disable-next-line:ordered-imports
import { TextDocument, ViewColumn, window, workspace, TextEditor } from 'vscode';
import { RestClientSettings } from '../models/configurationSettings';


export class HttpResponseTextDocumentView {

    private readonly settings: RestClientSettings = RestClientSettings.Instance;


    public constructor() {

    }

    public async render(response: string, column?: ViewColumn) {

        response=response.replace('gremlin> ','')
        response=response['replaceAll']('==>','')

        const language = "groovy"; // this.getVSCodeDocumentLanguageId(response);
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

        let p=new Promise<any>((r,j)=>{
            editor.edit(edit => {
                // const startPosition = new Position(0, 0);
                // edit.replace(new Range(startPosition, endPosition), content);
    
                const endPosition = document.lineAt(document.lineCount - 1).range.end;
                edit.insert(endPosition, response);
                r(1);
            });
        });

        await p;
        
    }

}