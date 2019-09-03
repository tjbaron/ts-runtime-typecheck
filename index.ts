
interface TypeProps {
    fn?: (d: any) => any
}

const TYPE = {
    string: (props: TypeProps = {}) => {
        return { ...props, _type: 'string' } as unknown as string;
    },
    number: (props: TypeProps = {}) => {
        return { ...props, _type: 'number' } as unknown as number;
    },
    boolean: (props: TypeProps = {}) => {
        return { ...props, _type: 'boolean' } as unknown as boolean;
    },
    array: <T>(interf: T, props: TypeProps = {}) => {
        return { ...props, _type: 'array', _subtype: interf } as unknown as Array<T>;
    },
    object: <T, U>(interf: T, opt: U, props: TypeProps = {}) => {
        return { ...props, _type: 'object', _required: interf, _optional: opt } as unknown as T & Partial<U>;
    },
    intersect: <T, U>(a: T, b: U, props: TypeProps = {}) => {
        const aa = a as any;
        const bb = b as any;
        let interf = {};
        let opt = {};
        if (aa._required && aa._optional) {
            interf = { ...aa._required };
            opt = { ...aa._optional };
        } else {
            interf = { ...aa };
        };
        if (bb._required && bb._optional) {
            interf = { ...interf, ...bb._required };
            opt = { ...opt, ...bb._optional };
        } else {
            interf = { ...interf, ...bb };
        };
        return { ...props, _type: 'object', _required: interf, _optional: opt } as unknown as T & U;
    }
}

/**
 * Define an interface similar to Typescripts regular interfaces, but that can do both
 * compile-time and run-time type checking.
 */
class Interface<T> {
    dataType: T;

    constructor(dataType: T) {
        this.dataType = dataType;
    }

    /**
     * Pass an object through this to get intellisense and compile-time type checking
     * applied to it.
     * @param data 
     */
    cast(data: T) {
        return data;
    }

    /**
     * The passed object will by checked at runtime against our interface. Returns true
     * if the object matches, or an object with an error message.
     * @param data 
     */
    validate(data: T) {
        const dataType = this.dataType;
        return this.validateObject(data, dataType, []);
    }

    private validateObject(data, dataType, path, optionals=false) {
        if (typeof(dataType) === 'function') {
            console.error(`ts-runtime-typecheck: Runtime validation error. All TYPE members must be called as a fuction using ().`);
            return true;
        } else if (!dataType._type) {
            for (var e in dataType) {
                const res = this.validateObject(data[e], dataType[e], [...path, e]);
                if (res !== true) return res;
            }
            return true;
        } else if (dataType._type === 'object') {
            console.log(dataType);
            for (var e in dataType._required) {
                const res = this.validateObject(data[e], dataType._required[e], [...path, e]);
                if (res !== true) return res;
            }
            for (var e in dataType._optional) {
                const res = this.validateObject(data[e], dataType._optional[e], [...path, e], true);
                if (res !== true) return res;
            }
            return true;
        } else {
            return this.validateItem(data, dataType, path, optionals);
        }
    }

    private validateItem(data, dataType, path, optionals=false) {
        if (optionals && data === undefined) {
            return true;
        } else if (dataType._type === 'array') {
            if (Array.isArray(data)) {
                for (let i=0; i<data.length; i++) {
                    const res = this.validateObject(data[i], dataType._subtype, [...path, String(i)]);
                    if (res !== true) return res;
                }
                return true;
            } else {
                return { [path.join('.')]: 'Not an array' };
            }
        } else if (typeof(data) === dataType._type) {
            if (dataType.fn) {
                const fnres = dataType.fn(data);
                if (fnres !== true) return { [path.join('.')]: fnres };
            }
            return true;
        } else {
            return { [path.join('.')]: `Expecting ${dataType._type} but got ${typeof(data)}.` };
        }
    }
}
