import { $rest, failure, pattern } from './pattern-matcher.js';
import { assertEquals, assertInstanceOf, assertArrayIncludes } from "https://deno.land/std@0.209.0/assert/mod.ts";

Deno.test('pattern should match object', () => {

    const matcher = pattern(({sym}) => 
        ({
            name: "Bob",
            relatives: {
                cousin: sym("name")
            }
        })
    )

    const result = matcher({
        name: "Bob",
        relatives: {
            cousin: "James"
        }
    });

    assertEquals(result.get('name'), 'James');

});

Deno.test('pattern should match array', () => {

    const matcher = pattern(({ sym, $rest }) =>
        [
            sym("first"),
            $rest
        ]);
    
    const result = matcher(['one', 'dos', 'drie']);
    assertEquals(result.get('first'), 'one');
    assertEquals(result.get($rest), ['dos', 'drie']);

});


Deno.test('rest pattern should match object', () => {
    
    const matcher = pattern(({ sym, $rest }) => 
        ({
            name: "Sarah",
            [$rest]: sym("deets")
        })
    )

    const result = matcher({
        name: "Sarah",
        tel: "01234 567 980",
        address: "123 Keep Reading Me, Nowhere"
    });

    assertEquals(result.get('deets'), {
        tel: "01234 567 980",
        address: "123 Keep Reading Me, Nowhere"
    });

});

Deno.test('pattern fails without match', () => {
    
    const matcher = pattern(({ sym }) => 
        ({
            name: "Bob",
            relatives: {
                cousin: sym("name")
            }
        })
    )
    
    const result = matcher({
        name: "WrongName",
        relatives: {
            cousin: "James"
        }
    });

    assertEquals(result, failure);

});


Deno.test('Multiple sym(name) cause failure with differing matches', () => {
    
    const match = pattern(({ sym }) => 
        ({
            x: sym("diff"),
            y: sym("diff")
        })
    )

    const result = match({
        x: 1,
        y: 2
    });

    assertEquals(result, failure);
});


Deno.test('Multiple sym(name) matches with identical matches', () => {
    
    const m = pattern(({ sym }) => 
        ({
            x: sym("same"),
            y: sym("same")
        })
    )
    
    const result = m({
        x: 1,
        y: 1
    });

    assertEquals(result.get('same'), 1);

});


Deno.test('pattern fails when first element of an array does not match', () => {

    // Test should only pass if relaxedArrayMatcher is used in place of arrayMatcher.

    const d = pattern(({sym, $rest}) =>
        [
            "one",
            sym("second"),
            $rest
        ])
    const result = d(['badApple', 'one', 'dos', 'drie']);
    assertEquals(result, failure);
});


Deno.test('pattern matches with multiple object children', () => {
    const mockAst = (type, value) => ({ type, value })

    const p = pattern(({ sym }) => [
        mockAst("number", sym("first")),
        mockAst("operator", "x"),
        mockAst("number", sym("second"))
    ]);
    const result = p([
        mockAst("number", 5),
        mockAst("operator", "x"),
        mockAst("number", 2)
    ])

    assertEquals(result.get("first"), 5)
    assertEquals(result.get("second"), 2)
})


Deno.test('Error Case: Dimension AST pattern should match object', () => {

    const measure = Symbol.for("measure");
     
    const ast = (type, value) => ({ type, value });

    const matcher = pattern(({ sym }) => [
        ast(measure, sym("first")),
        { value: "x" },
        ast(measure, sym("second"))
    ]);
        
    const result = matcher([
        ast(measure, '4cm'),
        ast(undefined, 'x'),
        ast(measure, '4.5cm')
    ])

    assertEquals(result.get('first'), '4cm')
    assertEquals(result.get('second'), '4.5cm')

})


Deno.test("Error Case: Object patterns should fail politely against primitives", () => {

    assertEquals(
        pattern(() => ({ prop: "" }))(undefined),
        failure
    )

    assertEquals(
        pattern(() => [ "value" ])(undefined),
        failure 
    )

})



Deno.test("Matches array pattern after a $rest element", () => {

    /** [1...100] */
    const input = Array(100).fill(0).map((_, ix) => ix + 1);
    const compare = input.slice(2, 98);

    const matcher = pattern(({ rest }) =>
        [1, 2, $rest, 99, 100])
    
    const result = matcher(input);

    assertArrayIncludes(result.get($rest), compare)
    assertEquals(result.get($rest).length, compare.length)

})


Deno.test("RegExp patterns should match literally and test against strings", () => {

    const rx = /^hello\s+.*$/ig;
    const matcher = pattern(() => rx);

    const literal = matcher(rx.toString());
    assertInstanceOf(literal, Map);

    const metaphorical = matcher('Hello world');
    assertInstanceOf(literal, Map);

})





Deno.test("Matches TypedArrays", () => {

    const matcher = pattern(() =>
        new Uint8Array([0, 1, 2]))
    
    const result = matcher(
        new Uint16Array([0, 1, 2]))

    assertInstanceOf(result, Map);
    
})