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
                return (
                        // Identical expression
                        pattern.toString() === obj?.toString()
                        // Or RegExp match
                        || pattern.test(obj)
                    )
                    ? new Map
                    : failure;
            }
            // TODO: Maps, WeakMaps, Sets & WeakSets - handle like Objects or Arrays
            else if (
                Array.isArray(pattern)
                || pattern instanceof Int8Array
                || pattern instanceof Uint8Array
                || pattern instanceof Uint8ClampedArray
                || pattern instanceof Int16Array
                || pattern instanceof Uint16Array
                || pattern instanceof Int32Array
                || pattern instanceof Uint32Array
                || pattern instanceof BigInt64Array
                || pattern instanceof BigUint64Array
                || pattern instanceof Float32Array
                || pattern instanceof Float64Array
                )
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



/** Matches a given array pattern independent of where in
 * the array the pattern may exist.
 *
 * Drop-in alternative to `arrayMatcher` */
function relaxedArrayMatcher(symbols, pattern, obj) {

    const potentialMatches = obj.length - pattern.length + 1;

    const RESULT_SEARCH_FAILED = new Map;
    const results = Array(potentialMatches)
                    .fill(undefined)
                    .map(v => new Map);

    // We build a list of starting positions
    const POSITION_SEARCH_FAILED = -1;
    const positions =
        new Int16Array(potentialMatches)
        .map((_, ix) => ix)


    // Then we loop through the pattern once
    for (const pat of pattern) {

        for (let px = 0; px < positions.length; px++) {
            
            const pos = positions[px];
            if (pos >= obj.length) continue;
            if (pos === POSITION_SEARCH_FAILED) continue;
            
            let value = obj[pos];

            if (pat === $rest) {
                // Rest parameters hoover up everything remaining
                value = obj.slice(pos)
                positions[px] = pattern.length;
            }

            const res = matcher(symbols, pat, value);

            if (res instanceof Map) {
                const resultStore = results[px];
                for (const [sym, value] of res) {
            
                    // If this symbol has already been
                    // recorded, then it's new value MUST
                    // match the old value or it's
                    // considered a failure
                    if (resultStore.has(sym)
                        && resultStore.get(sym) !== value) {
                        res = failure;
                        break;
                    }
    
                    resultStore.set(sym, value);
                }
            }

            // Deliberately not an else clause.
            // `res` may have been updated by the above check.
            if (res === failure) {
                positions[px] = POSITION_SEARCH_FAILED;
                results[px] = RESULT_SEARCH_FAILED;
                continue;
            } 
                
            positions[px]++

        }

    }

    // Return the first successful match if it exists
    // ...or failure
    return results
        .filter(arr => arr !== RESULT_SEARCH_FAILED)
        ?.[0]
        ?? failure

}



/** Matches a given array in the order of the pattern */
function arrayMatcher(symbols, pattern, obj) {

    if (typeof obj !== "object") return failure;

    const results = new Map;

    let ixPattern;
    let ixObj;

    // We loop through both arrays at once. If we hit a
    // $rest element, we consume everything minus the last
    // few required to match the final half of the pattern,
    // if present. When that happens, ixPattern and ixObj
    // will no longer be identical
    //
    // A complex $rest pattern might look like: 
    //      [1, 2, $rest, 99, 100]
    
    for (ixPattern = 0, ixObj = 0;
        ixPattern < pattern.length && ixObj < obj.length;
        ixPattern++, ixObj++
    ) {

        if (! (ixObj in obj)) return failure;
        
        const pat = pattern[ixPattern];
        let value = obj[ixObj];

        if (pat === $rest) {
    
            const beginRestRangeIndex = ixPattern;
            const endRestRangeIndex = 
                1 + obj.length - (pattern.length - ixPattern)

            if (endRestRangeIndex < beginRestRangeIndex) {
                // Not enough elements to match the given pattern
                return failure;
            }
            
            value = Array.prototype.slice.call(
                obj,
                beginRestRangeIndex,
                endRestRangeIndex
            )

            ixObj = endRestRangeIndex - 1;

        };
        
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
    if (ixPattern < pattern.length) return failure;

    return results

}



function objectMatcher(symbols, pattern, obj) {

    if (typeof obj !== "object") return failure;

    const results = new Map;
    const props = Reflect.ownKeys(pattern);

    let ix;
    for (ix = 0; ix < props.length; ix++) {
        
        const prop = props[ix];

        const pat = pattern[prop];
        let value;

        if (prop === $rest) {
            // $rest hoovers up all properties not yet visited
            
            const visitedProps = props.slice(0, ix);
            
            value =
                Reflect.ownKeys(obj)
                    .filter(p => !visitedProps.includes(p))
                    .reduce((newObj, p) => {
                        newObj[p] = obj[p];
                        return newObj;
                    }, Object.create(null))
            
            ix = props.length;
        }
        else
        {
            if (!(prop in obj)) return failure;
            value = obj[prop];
        }

        const res = matcher(symbols, pat, value);

        if (res === failure) return failure;

        for (const [sym, value] of res) {

            // If this symbol has already been recorded, 
            // then it's new value MUST match the old value
            // or it's considered a failure
            if (results.has(sym)
                && results.get(sym) !== value) {
                return failure;
            }

            results.set(sym, value);
        }
    
    }
    
    // Incomplete matches are failures
    if (ix < props.length) return failure;

    return results
    
}