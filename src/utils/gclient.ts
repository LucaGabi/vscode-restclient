import { Observable } from 'rxjs';
import * as gremlin from '../utils/gs';

export function mapToObj(inputMap) {
    const obj = {};

    inputMap.forEach((value, key) => obj[key] = value);

    return obj;
}

export function edgesToJson(edgeList) {
    return edgeList.map(
        edge => ({
            id: typeof edge.get('id') !== "string" ? JSON.stringify(edge.get('id')) : edge.get('id'),
            from: edge.get('from'),
            to: edge.get('to'),
            label: edge.get('label'),
            properties: mapToObj(edge.get('properties')),
        })
    );
}

export function nodesToJson(nodeList) {
    return nodeList.map(
        node => ({
            id: node.get('id'),
            label: node.get('label'),
            properties: mapToObj(node.get('properties')),
            edges: edgesToJson(node.get('edges'))
        })
    );
}

export function makeQuery(query, nodeLimit) {
    const nodeLimitQuery = !isNaN(nodeLimit) && Number(nodeLimit) > 0 ? `.limit(${nodeLimit})` : '';
    return `${query}${nodeLimitQuery}.dedup().as('node').project('id', 'label', 'properties', 'edges').by(__.id()).by(__.label()).by(__.valueMap().by(__.unfold())).by(__.outE().project('id', 'from', 'to', 'label', 'properties').by(__.id()).by(__.select('node').id()).by(__.inV().id()).by(__.label()).by(__.valueMap().by(__.unfold())).fold())`;
}

var child: any = null;
var p: Observable<string>;
var isGremlinInited = 0;
export var PCP = { data: <any[]>[] };

export function execQuery(o: { path: string, query: string }): Observable<any> {

    if (!p)
        p = Observable.create((observer) => {
            if (isGremlinInited == 0) {

                isGremlinInited = 1;

                child = require('child_process').execFile(o.path + '\\gremlin.bat', [
                    // 'arg1', 'arg2', 'arg3', 
                ], {
                    // detachment and ignored stdin are the key here: 
                    cwd: o.path,
                    detached: true,
                    stdio: ['ignore', 1, 2]
                });
                // and unref() somehow disentangles the child's event loop from the parent's: 
                child.unref();
                child.stdout.on('data', function (data) {


                    if (isGremlinInited == 1) {
                        isGremlinInited = 2;

                        child.stdin.write(
                            `:remote connect tinkerpop.server conf/remote.yaml session\n
                         :remote console\n`);

                        child.stdin.write(`g\n`);

                    }

                    PCP.data.push(data)
                    observer.next(null)
                    

                });

                child.stdout.on('exit', () => {
                    isGremlinInited = 0;
                    observer.complete();
                })
            }
        });



    if (isGremlinInited == 2) {
        const query = o.query;
        child.stdin.write(`${query}\n`);
    }

    return p;
}

export function execQuery2(o: { host: string, port: number, nodeLimit: number, query: string }): Promise<any> {

    const p = new Promise<any>((r, j) => {

        const gremlinHost = o.host;
        const gremlinPort = o.port;
        // const nodeLimit = o.nodeLimit;
        const query = o.query;

        const client = new gremlin.driver.Client(`ws://${gremlinHost}:${gremlinPort}/gremlin`, {
            traversalSource: 'g', mimeType: 'application/json',
            session: 'grem0'
        });

        // client.submit(makeQuery(query, nodeLimit), {})
        //     .then((result) => r(nodesToJson(result._items)))
        //     .catch((err) => j(err));

        const all: any[] = [];
        query.split(';').forEach(element => {
            all.push(client.submit(element, {}));
        });

        Promise.all(all)
            .then(v => r(v[v.length - 1]))
            .catch((err) => j(err));

        // client.submit(query, {})
        //     .then((result) => r(result))
        //     .catch((err) => j(err));


    });

    return p;
}

