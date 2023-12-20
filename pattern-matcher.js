export const $rest = Symbol("rest");
export const failure = Symbol("failure");

export function pattern(fnPattern) {

    const symbols = new Map();

    const $ = {

        sym: (name) => {
            let sym = symbols.get(name);
            if (!sym) {
                sym = Symbol();
                symbols.set(name, sym);
            }
            return sym;
        },

        $rest

    }

    const pattern = fnPattern($);
    const invertedMap = new Map(
        Array.from(symbols.entries())
            .map(([name, symbol]) => [symbol, name])
    );

    return (thing) => matcher(invertedMap, pattern, thing);

}

function filterNotInList(exclusions) {
    return (val) => ! exclusions.includes(val)
}

function matcher(symbols, pattern, obj) {

    switch (typeof pattern) {

        case "object":

            if (pattern === null) 
            {
                return (pattern === obj) 
                    ? new Map
                    : failure;
            }
            else if (pattern instanceof Date) 
            {
                return (pattern.getTime() === obj?.getTime())
                    ? new Map
                    : failure;
            }
            else if (pattern instanceof RegExp)
            {
                return (pattern.toString() === obj?.toString())
                    ? new Map
                    : failure;
            }
            // TODO: Maps, WeakMaps, Sets & WeakSets - handle like Objects or Arrays
            else if (Array.isArray(pattern)) 
            {
                return arrayMatcher(symbols, pattern, obj);
            }
            else 
            {
                return objectMatcher(symbols, pattern, obj);
            }

        case "symbol":
            // Handle mapping of symbols

            if (symbols.has(pattern)) 
            {
                return new Map([
                    [symbols.get(pattern),
                     obj]
                ])
            } 
            else if (pattern === $rest)
            {
                // HACK: Doesn't seem to fit, but neither
                // does a map as a return value
                return new Map([ [$rest, obj] ])
            } 

            // fallthrough

        case "string":
        case "boolean":
        case "number":
        case "undefined":
        case "bigint":
        case "function":
            return (pattern === obj) 
                ? new Map
                : failure;

    }

}



/** Matches a given array in the order of the pattern */
function arrayMatcher(symbols, pattern, obj) {

    const results = new Map;

    let ix;
    for (ix = 0; ix < pattern.length; ix++) {
        
        if (! (ix in obj)) return failure;
        
        const pat = pattern[ix];
        let value = obj[ix];

        if (pat === $rest) {
            // Rest parameters hoover up everything remaining
            value = obj.slice(ix)
            ix = pattern.length;
        }
        
        const res = matcher(symbols, pat, value);

        if (res === failure) {
            return failure;
        }

        for (const [sym, value] of res) {
            
            // If this symbol has already been recorded, 
            // then it's new value MUST match the old value
            // or it's considered a failure
            if (results.has(sym)
                && results.get(sym) !== value)
            {
                return failure;
            }

            results.set(sym, value);
        }
    }

    // Incomplete matches are failures
    if (ix < pattern.length) return failure;

    return results

}



function objectMatcher(symbols, pattern, obj) {

    const results = new Map;
    const props = Reflect.ownKeys(pattern);

    let ix;
    for (ix = 0; ix < props.length; ix++) {
        
        const prop = props[ix];

        const pat = pattern[prop];
        let value;

        if (prop === $rest) 
        {
            const visitedProps = props.slice(0, ix);
            
            value = 
                Reflect.ownKeys(obj)
                .filter(p => ! visitedProps.includes(p))
                .reduce((newObj, p) => {
                    newObj[p] = obj[p];
                    return newObj;
                }, Object.create(null))
            
            ix = props.length;
        } 
        else 
        {
            if (! (prop in obj)) return failure;
            value = obj[prop];
        }

        const res = matcher(symbols, pat, value);

        if (res === failure) return failure;

        for (const [sym, value] of res) {

            // If this symbol has already been recorded, 
            // then it's new value MUST match the old value
            // or it's considered a failure
            if (results.has(sym)
                && results.get(sym) !== value)
            {
                return failure;
            }

            results.set(sym, value);
        }
    
    // Incomplete matches are failures
    if (ix < props.length) return failure;

    return results
}

