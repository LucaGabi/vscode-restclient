import { ExtensionContext, Range, window } from 'vscode';
import Logger from '../logger';
import { RestClientSettings } from '../models/configurationSettings';
import { trace } from "../utils/decorator";
import { execQuery, PCP } from '../utils/gclient';
import { RequestState, RequestStatusEntry } from '../utils/requestStatusBarEntry';
import { SelectedQuery } from './../utils/selector';

import { Selector } from '../utils/selector';
import { getCurrentTextDocument } from '../utils/workspaceUtility';
import { HttpResponseTextDocumentView } from '../views/httpResponseTextDocumentView';
import { HttpResponseWebview } from '../views/httpResponseWebview';

// const stringify = require("json-stringify-pretty-compact");


export class RequestController {
    //private readonly _restClientSettings: RestClientSettings = RestClientSettings.Instance;
    private _requestStatusEntry: RequestStatusEntry;
    private _webview: HttpResponseWebview;
    private _textDocumentView: HttpResponseTextDocumentView;
    private _lastRequest?: SelectedQuery;

    public constructor(context: ExtensionContext) {
        this._requestStatusEntry = new RequestStatusEntry();
        this._webview = new HttpResponseWebview(context);
        this._webview.onDidCloseAllWebviewPanels(() => this._requestStatusEntry.update({ state: RequestState.Closed }));
        this._textDocumentView = new HttpResponseTextDocumentView();
    }

    @trace('Request')
    public async run(range: Range) {
        const editor = window.activeTextEditor;
        const document = getCurrentTextDocument();
        if (!editor || !document) {
            return;
        }

        const selectedRequest = await Selector.getRequest(editor, range);
        if (!selectedRequest) {
            return;
        }

        //TODO: send to gdb
        // const { text, name } = selectedRequest;



        // parse http request
        // const httpRequest = await RequestParserFactory.createRequestParser(text).parseHttpRequest(name);

        await this.runCore(selectedRequest);
    }

    @trace('Rerun Request')
    public async rerun() {
        if (!this._lastRequest) {
            return;
        }

        await this.runCore(this._lastRequest);
    }

    @trace('Cancel Request')
    public async cancel() {
        //TODO:
        // this._lastPendingRequest?.cancel();

        this._requestStatusEntry.update({ state: RequestState.Cancelled });
    }

    private async runCore(query: SelectedQuery) {
        // clear status bar
        this._requestStatusEntry.update({ state: RequestState.Pending });

        // TODO:

        execQuery(
            {
                query: query.text,
                path: RestClientSettings.Instance.clientPath// 'C:\\Users\\Luca\\Downloads\\gc-3.3.11\\bin',
                // host:  RestClientSettings.Instance.gremlinHost || '127.0.0.1',
                // port:  RestClientSettings.Instance.gremlinPort || 8182,
                // nodeLimit: 1000,
            }
        ).subscribe(x => this.processAllData(x));

    }

    t: any = 0;
    processAllData(response) {

        if (response == null && this.t > 0) {
            return;
        }
        if (response === undefined) {
            this.t = 0;
            return;
        }

        if (!response) {
            this.t=1;
            response = PCP.data.pop();
        }
        this._requestStatusEntry.update({ state: RequestState.Received, response });
        try {

            const activeColumn = window.activeTextEditor!.viewColumn;
            const previewColumn = activeColumn;

            // query.text = response;
            this._textDocumentView.render(response, previewColumn).then(() => {
                setTimeout(() => {
                    this.t = this.processAllData(PCP.data.pop())
                }, 0);
            });

        } catch (reason) {
            Logger.error('Unable to preview response:', reason);
            window.showErrorMessage(reason);
        }
    }


    public dispose() {
        this._requestStatusEntry.dispose();
        this._webview.dispose();
    }
}