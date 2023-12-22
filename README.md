# The Relaxed Pattern Matcher

This is a pattern matcher for JavaScript which can walk nested objects and arrays to extract data. It's relaxed, so additional properties and extra array entries beyond what your pattern specifies are accepted.

Requires ES6+ as it uses Symbols for placeholders behind the scenes.

## How To Use

Only one function is directly exposed:
### ```pattern(callbackFn) => matcherFn```

`pattern` takes a one-parameter function that should return a pattern (this can be any JavaScript value). 

Once called, pattern will return a new function which can used to pattern-match against specific data (again, taking only one argument).

Your one-parameter function (`callbackFn`) will receive an object with two members:

| property | description |
|----------|-------------|
| `sym` | a function which provides placeholder symbols. It expects a name for the symbol. Useful for data extraction. |
| `$rest` | which allows you to extract all remaining array entries or properties of an object |

The result of calling pattern is 
`matcherFn`:

### `matcherFn(thing) => Map | failure`

This a one parameter function you can call to attempt to match your chosen pattern.
* Successful pattern matches return a `name`->value Map (where `name` was set by the sym function) 
* Failed pattern matches return the exported symbol `failure`.

### Other Exports 
`$rest` and `failure` are also exported for convenience.

## Miscellany

Maps, Sets and their Weak variants are currently not handled, but can be easily added later - let me know if you'd find it useful.



## Examples




### Nested Data Extraction

```javascript
// Task: 
// Given a persons details, extract the name of their cousin

import {pattern} from "./pattern-matcher.js";

const matcherUpper = pattern(({sym}) => 
    ({
        name: "Bob",
        relatives: {
            // Whatever cousin is here, store it under "name"
            cousin: sym("name") 
        }
    })
)

const result = matcherUpper({
    name: "Bob",
    relatives: {
        cousin: "James"
    }
});

result.get('name') // => "James"
```




### Object Rest Extraction

```javascript
// Task:
// Given a potential sales lead, extract all contact 
// information except for their name

import {pattern} from "./pattern-matcher.js";

const j = pattern(({sym, $rest}) => 
    ({
        name: "Sarah",
        // Store the rest under "contactInfo"
        [$rest]: sym("contactInfo") 
    })
);

const result = j({
    name: "Sarah",
    tel: "01234 567 980",
    address: "123 Keep Reading Me, Nowhere"
});

result.get('contactInfo');
// =>  { tel: "01234 567 980",
//       address: "123 Keep Reading Me, Nowhere" }
```




### Handling Match Failures

```javascript
// Task:
// Given a persons favourite film, judge them 

import {pattern, failure} from "./pattern-matcher.js";

const matcher = pattern(() => "Pulp Fiction");

const result = matcher("Rambo");

if (result !== failure) {
    console.log("You bad mother fucker. You cool.")
} else {
    console.log("I can't believe you said that... I thought you had taste.")
}
```



### Array Rest Extraction

```javascript
// Task:
// Given the first two words of a rhyme, let me know the rest

import {pattern, $rest} from "./pattern-matcher.js";

const input = [ "one", "two", "miss", "a", "few" ];

// Option 1: Use $rest by itself, and extract with 
//           `result.get($rest)` later
function anonymous() {
    
    const matcher = pattern(
        ({$rest}) => [ "one", "two", $rest ])

    const result = matcher(input)

    return result.get($rest) 
    // => [ "miss", "a", "few" ]

}

// Option 2: Pretend you're looking for an object with 
//           numbered properties, and use sym to name the 
//           result
function withName() {

    const matcher = pattern(({sym, $rest}) => 
        ({
            0: "one",
            1: "two",
            [$rest]: sym("missed a few")
        }))

    const result = matcher(input).get('missed a few')
    // => { "2": "miss", "3": "a", "4": "few" }

    return result
    // To convert the result back to an array you could 
    // do something like:
    //    Reflect.ownKeys(result)
    //           .filter(prop !== 'length')
    //           .sort()
    //           .map(prop => result[prop])
}
  
```


### Matching A Specific Class of Object
```javascript
// Task: 
// Identify pairs of fighters, and put together a match title

import {pattern} from "./pattern-matcher.js";

class Fighter {
    constructor(name) {
        this.name = name;
    } 
};

const input = [
    new Fighter("Dave"),
    new Fighter("Agatha")
];

const matcher = pattern(({sym}) => [
    { constructor: Fighter, name: sym("first") },
    { constructor: Fighter, name: sym("second") }
])

const result = matcher(input);

console.log(
    'New Match: '
    + result.get('first')
    + ' vs. '
    + result.get('second')
    + '!'
);

//=> New Match: Dave vs. Agatha!

```


### Multiple Property Extraction

```javascript
// Task:
// The boss has declared war on stress. Anyone showing signs 
// of stress is to be instantly dismissed. 

import { pattern } from "./pattern-matcher.js";

const stressThreshold = 1;
const input = {
    name: "Sandra",
    stressAsPercentage: Math.round(Math.random() * 100)
}

const matcher = pattern(({sym}) => ({ 
    name: sym("name"),
    stressAsPercentage: sym("stressLevel")
}))

const result = matcher(input);

if (result.get('stressLevel') > stressThreshold) {
    [
        result.get("name") + ", are you feeling stressed yet?",
        "Are you?",
        "Are you?",
        "Good.",
        "You can stay."
    ].map((msg, ix) => 
        setTimeout(
            () => console.log(msg), 
            ix * 800))
} else {
    console.log(
        result.get("name")
        + ", you're done. Pack your bags and go."
    )
}

```




### Match Multiple Elements *Only If* Same Value


```javascript
// Task: A number multiplied by itself is squared. Identify 
//       whether a set of tokens is a squared number. 

import { pattern, failure } from "./pattern-matcher.js"

const input = [4, '*', 4];

const matcher = pattern(({ sym }) => [
    sym("num"),
    "*",
    sym("num")
]);
        
const result = matcher(input)

if (result === failure) {
    console.log("Not squared.")
} else {
    console.log(result.get('num') + ' was squared!')
}

//=> 4 was squared!

```