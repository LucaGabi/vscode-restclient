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

export function execQuery(o: { host: string, port: number, nodeLimit: number, query: string }): Promise<any> {

    const p = new Promise<any>((r, j) => {

        const gremlinHost = o.host;
        const gremlinPort = o.port;
        const nodeLimit = o.nodeLimit;
        const query = o.query;

        const client = new gremlin.driver.Client(`ws://${gremlinHost}:${gremlinPort}/gremlin`, { traversalSource: 'g', mimeType: 'application/json' });

        // client.submit(makeQuery(query, nodeLimit), {})
        //     .then((result) => r(nodesToJson(result._items)))
        //     .catch((err) => j(err));

        client.submit(query, {})
            .then((result) => r(result))
            .catch((err) => j(err));


    });

    return p;
}

