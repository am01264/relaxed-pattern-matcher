

const m = pattern(({sym}) => 
    ({
        name: "Bob",
        relatives: {
            cousin: sym("name")
        }
    })
)


console.log(m({
    name: "Bob",
    relatives: {
        cousin: "Luka"
    }
}))



function pattern(fnPattern) {

    const symbols = new Map;

    const $ = {

        sym: (name) => {
            let sym = symbols.get(name);
            if (!sym) {
                sym = Symbol();
                symbols.set(name, sym);
            }
            return sym;
        },

        $rest: Symbol("rest")

    }

    const pattern = fnPattern($);
    const invertedMap = new Map(
        Array.from(symbols.entries())
            .map(([name, symbol]) => [symbol, name])
    );

    console.debug({
        pattern, invertedMap
    })

    return (thing) => matcher(invertedMap, pattern, thing);

}

function filterNotInList(exclusions) {
    return (val) => ! exclusions.includes(val)
}

function matcher(symbols, pattern, obj) {

    console.debug({
        symbols,
        pattern, 
        obj
    })

    const failure = undefined;
    const $rest = Symbol("rest");

    switch (typeof pattern) {

        case "object":

            if (Array.isArray(pattern)) {
                return pattern.reduce((acc, pat, ixArr, arr) => {
                    if (acc === failure) return failure;

                    // TODO: Implement $rest pattern
                    // if (pat === $rest) {
                    //     value = obj.slice(ixArr)
                    // }

                    const application = matcher(symbols, pat, obj[ixArr]);
                    
                    if (application === failure) {
                        return failure;
                    } else {
                        return new Map([...acc, ...application])
                    }
                    
                }, new Map)

            }

            else 
                return Reflect
                .ownKeys(pattern)
                .reduce((acc, prop, ixArr, arr) => {
                    if (acc === failure) return acc;

                    let value = undefined;

                    // TODO: Implement $rest pattern
                    // if (prop === "$rest") {

                    //     const visited = acc.slice(0, ixArr)

                    //     value =  Reflect.ownKeys(obj)
                    //                     .filter((prop) => ! visited.includes(prop))
                    //                     .reduce((acc, prop) => {
                    //                                 acc[prop] = obj[prop];
                    //                                 return acc;
                    //                             },
                    //                             Object.create(null))

                    // } else 
                    if (prop in obj) { 
                        value = obj[prop]
                    } else {
                        return failure;
                    }

                    const application = matcher(symbols, pattern[prop], value);
                    
                    if (application === failure) {
                        return failure;
                    }
                    
                    return new Map([...acc, ...application])
                
                }, new Map)

        case "symbol":
            // Handle mapping of symbols

            if (symbols.has(pattern)) {
                return new Map([
                    [symbols.get(pattern),
                     obj]
                ])
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
