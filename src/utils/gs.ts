import { driver, process, structure } from 'gremlin';

//// @ts-ignore
import { MapSerializer, Path3Serializer } from 'gremlin/lib/structure/io/type-serializers';

MapSerializer.prototype.deserialize = function (obj: any) {
    const value = obj['@value'];
    if (!Array.isArray(value)) {
        throw new Error('Expected Array, obtained: ' + value);
    }
    const result = {};
    for (let i = 0; i < value.length; i += 2) {
        // @ts-ignore
        result[`${this.reader.read(value[i])}`] = this.reader.read(value[i + 1]);
    }
    return result;
};

Path3Serializer.prototype.deserialize = function (obj: any) {
    const value = obj['@value'];
    var o = this.reader.read(value['objects']);
    return o;
};


const { withOptions, t, P, column, order } = process;
export { driver, structure, withOptions, t, P, column, order, process };