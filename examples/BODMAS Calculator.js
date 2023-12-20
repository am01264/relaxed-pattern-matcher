import { failure, pattern } from "../pattern-matcher.js";

const token = (type, value) => ({ type, value })

const divide = pattern(({ sym }) => [
    token("number", sym("first")),
    token("operation", "÷"),
    token("number", sym("second")),
]);

const multiply = pattern(({ sym }) => [
    token("number", sym("first")),
    token("operation", "×"),
    token("number", sym("second")),
]);

const add = pattern(({ sym }) => [
    token("number", sym("first")),
    token("operation", "+"),
    token("number", sym("second")),
])

const BODMAS = "5 + 4 × 3 ÷ 6";
let tokens = BODMAS
    .split(/\s+/)
    .map(word =>
        (isNaN(+word))
        ? token("operation", word)
        : token("number", +word))

const actions = [
    [divide, (first, second) => first / second],
    [multiply, (first, second) => first * second],
    [add, (first, second) => first + second]
];

function display(tokens) {
    console.log(
        '= ' + 
        tokens.map(({ value }) => value)
        .join(' ')
    )
}

console.log(`BODMAS Replacement in action:`)
display(tokens)

for (const [matcher, action] of actions) 
{
    for (let tx = 0; tx < tokens.length; tx++) {
        const tokenWindow = tokens.slice(tx, tx + 3);
        const result = matcher(tokenWindow);

        if (result === failure) continue;

        const before = tokens.slice(0, tx)
        const inter = token("number", action(result.get("first"), result.get("second")))
        const after = tokens.slice(tx + 3)

        tokens = [...before, inter, ...after]
        display(tokens)
    }
}
