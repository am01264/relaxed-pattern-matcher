import { $rest, pattern } from './pattern-matcher.js';
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






// describe('Pattern Matcher', () => {
    

//     test('should match pattern with array', () => {
//         const d = pattern(({sym, $rest}) =>
//             [
//                 sym("first"),
//                 $rest
//             ])
//         const result = d(['one', 'dos', 'drie']);
//         expect(result.get('first')).toBe('one');
//         expect(result.get('rest')).toEqual(['dos', 'drie']);
//     });

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

//     test('should return failure when pattern does not match', () => {
//         const m = pattern(({sym}) => 
//             ({
//                 name: "Bob",
//                 relatives: {
//                     cousin: sym("name")
//                 }
//             })
//         )
//         const result = m({
//             name: "Bob",
//             relatives: {
//                 cousin: "Not James"
//             }
//         });
//         expect(result).toBe(Symbol('failure'));
//     });
// });