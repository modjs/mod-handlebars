mod-handlebars
===

Compile Handlebars templates to JavaScript templates file


## Usage

```js
module.exports = {
    plugins: {
        "handlebars": "mod-handlebars"
    },
    tasks: {
        "handlebars": {
            src: "test.hbs",
            dest: "test.js"
        }
    }
};
```