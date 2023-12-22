import { $rest, failure, pattern } from './pattern-matcher.js';
import { assertEquals } from "https://deno.land/std@0.209.0/assert/assert_equals.ts";

Deno.test('should match pattern with object', () => {
    const m = pattern(({sym}) => 
        ({
            name: "Bob",
            relatives: {
                cousin: sym("name")
            }
        })
    )
    const result = m({
        name: "Bob",
        relatives: {
            cousin: "James"
        }
    });
    assertEquals(result.get('name'), 'James');
});

Deno.test('should match pattern with array', () => {
    const d = pattern(({sym, $rest}) =>
        [
            sym("first"),
            $rest
        ])
    const result = d(['one', 'dos', 'drie']);
    assertEquals(result.get('first'), 'one');
    assertEquals(result.get($rest), ['dos', 'drie']);
});


Deno.test('should match pattern with rest in object', () => {
    const j = pattern(({sym, $rest}) => 
        ({
            name: "Sarah",
            [$rest]: sym("deets")
        })
    )
    const result = j({
        name: "Sarah",
        tel: "01234 567 980",
        address: "123 Keep Reading Me, Nowhere"
    });
    assertEquals(result.get('deets'), {
        tel: "01234 567 980",
        address: "123 Keep Reading Me, Nowhere"
    });
});

Deno.test('should return failure when pattern does not match', () => {
    const m = pattern(({sym}) => 
        ({
            name: "Bob",
            relatives: {
                cousin: sym("name")
            }
        })
    )
    const result = m({
        name: "WrongName",
        relatives: {
            cousin: "James"
        }
    });
    assertEquals(result, failure);
});


Deno.test('should return failure when two identical pattern symbols do not match in a given thing', () => {
    const m = pattern(({sym}) => 
        ({
            x: sym("diff"),
            y: sym("diff")
        })
    )
    const result = m({
        x: 1,
        y: 2
    });
    assertEquals(result, failure);
});


Deno.test('should match two identical pattern symbols with identical results in a given thing', () => {
    const m = pattern(({sym}) => 
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


Deno.test('should fail pattern when first element of an array does not match', () => {

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


Deno.test('should match pattern with multiple object children', () => {
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


Deno.test('does not walk prototype chain', () => {
    class Mockery { }

    const p = pattern(({ sym }) => {
        constructor: sym("constructor")
    });

    const result = p(new Mockery)


    assertEquals(result, failure)
})


Deno.test('should match a specific pattern', () => {

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


Deno.test("Should fail without error when object compared against primitive", () => {

    assertEquals(
        pattern(() => ({ prop: "" }))(undefined),
        failure
    )

    assertEquals(
        pattern(() => [ "value" ])(undefined),
        failure 
    )

})