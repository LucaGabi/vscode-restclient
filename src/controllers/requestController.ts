import { ExtensionContext, Range, window } from 'vscode';
import Logger from '../logger';
import { RestClientSettings } from '../models/configurationSettings';
import { trace } from "../utils/decorator";
import { execQuery } from '../utils/gclient';
import { RequestState, RequestStatusEntry } from '../utils/requestStatusBarEntry';
import { SelectedQuery } from './../utils/selector';

import { Selector } from '../utils/selector';
import { getCurrentTextDocument } from '../utils/workspaceUtility';
import { HttpResponseTextDocumentView } from '../views/httpResponseTextDocumentView';
import { HttpResponseWebview } from '../views/httpResponseWebview';

const stringify = require("json-stringify-pretty-compact");

export class RequestController {
    private readonly _restClientSettings: RestClientSettings = RestClientSettings.Instance;
    private _requestStatusEntry: RequestStatusEntry;
    private _webview: HttpResponseWebview;
    private _textDocumentView: HttpResponseTextDocumentView;
    private _lastRequest?: SelectedQuery;
    private _lastPendingRequest?: SelectedQuery;

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
        // // set last request and last pending request
        // this._lastPendingRequest = this._lastRequest = httpRequest;

        // set http request
        try {
            const response = await execQuery(
                {
                    host:  RestClientSettings.Instance.gremlinHost || '127.0.0.1',
                    port:  RestClientSettings.Instance.gremlinPort || 8182,
                    nodeLimit: 1000,
                    query: query.text
                }
            );

            // // check cancel
            // if (httpRequest.isCancelled) {
            //     return;
            // }

            this._requestStatusEntry.update({ state: RequestState.Received, response });

            // if (httpRequest.name && document) {
            //     RequestVariableCache.add(document, httpRequest.name, response);
            // }

            try {

                // const setting: vscode.Uri = vscode.Uri.parse("untitled:" + httpRequest.name + '.json');
                // vscode.workspace.openTextDocument(setting).then((a: vscode.TextDocument) => {
                //     vscode.window.showTextDocument(a, 1, false).then(e => {
                //         e.edit(edit => {
                //             edit.insert(new vscode.Position(0, 0), response);
                //         });
                //     });
                // }, (error: any) => {
                //     console.error(error);
                //     debugger;
                // });

                const activeColumn = window.activeTextEditor!.viewColumn;
                const previewColumn = activeColumn;

                // this._restClientSettings.previewColumn === ViewColumn.Active
                //     ? activeColumn
                //     : ((activeColumn as number) + 1) as ViewColumn;
                if (true) {
                    query.text = stringify(response._items);
                    this._textDocumentView.render(query, previewColumn);
                }
                // else if (previewColumn) {
                //     this._webview.render(response, previewColumn);
                // }
            } catch (reason) {
                Logger.error('Unable to preview response:', reason);
                window.showErrorMessage(reason);
            }

            //TODO:
            // // persist to history json file
            // await UserDataManager.addToRequestHistory(HistoricalHttpRequest.convertFromHttpRequest(httpRequest));
        } catch (error) {
            // // check cancel
            // if (httpRequest.isCancelled) {
            //     return;
            // }

            if (error.code === 'ETIMEDOUT') {
                error.message = `Please check your networking connectivity and your time out in ${this._restClientSettings.timeoutInMilliseconds}ms according to your configuration 'rest-client.timeoutinmilliseconds'. Details: ${error}. `;
            } else if (error.code === 'ECONNREFUSED') {
                error.message = `Connection is being rejected. The service isn’t running on the server, or incorrect proxy settings in vscode, or a firewall is blocking requests. Details: ${error}.`;
            } else if (error.code === 'ENETUNREACH') {
                error.message = `You don't seem to be connected to a network. Details: ${error}`;
            }
            this._requestStatusEntry.update({ state: RequestState.Error });
            Logger.error('Failed to send request:', error);
            window.showErrorMessage(error.message);
        } finally {
            if (this._lastPendingRequest === query) {
                this._lastPendingRequest = undefined;
            }
        }
    }

    public dispose() {
        this._requestStatusEntry.dispose();
        this._webview.dispose();
    }
}