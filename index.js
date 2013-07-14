var fs = require('fs');
var basename = require('path').basename;

exports.summary = 'Compile Handlebars templates to JavaScript templates file';

exports.usage = '<src> [options]';

exports.options = {
    "dest" : {
        alias : 'd'
        ,default : '<src>'
        ,describe : 'destination file or directory'
    },

    'amd': {
        'type': 'boolean',
        'description': 'Exports amd style (require.js)'
    },

    'commonjs': {
        'type': 'string',
        'description': 'Exports CommonJS style, path to Handlebars module',
        'default': null
    },

    'handlebarPath': {
        'type': 'string',
        'description': 'Path to handlebar.js (only valid for amd-style)',
        'default': ''
    },

    'known': {
        'type': 'string',
        'description': 'Known helpers'
    },

    'knownOnly': {
        'type': 'boolean',
        'description': 'Known helpers only'
    },

    'namespace': {
        'type': 'string',
        'description': 'Template namespace',
        'default': 'Handlebars.templates'
    },

    'simple': {
        'type': 'boolean',
        'description': 'Output template function only.'
    },

    'root': {
        'type': 'string',
        'description': 'Template root. Base value that will be stripped from template names.'
    },

    'partial' : {
        'type': 'boolean',
        'description': 'Compiling a partial template'
    },

    'extension': {
        'type': 'string',
        'description': 'Template extension.',
        'default': 'handlebars|hbs'
    },

    "charset" : {
        alias : 'c'
        ,default : 'utf-8'
        ,describe : 'file encoding type'
    },

    "postParse" : {
        type: "function"
        , describe: "post parse the handlebars template into it's AST"
    }
};

exports.run = function (options) {
    var src = options.src;
    var dest = options.dest;

    options.extension = options.extension.replace(/[\\^$*+?.():=!{}\-\[\]]/g, function(arg) { 
        return '\\' + arg; 
    }).split('|').map(function(ext){
        return '\\.' + ext;
    }).join('|');
    options.extension = new RegExp( options.extension + '$');
    
    exports.files.forEach(function(inputFile){
        var outputFile = dest;

        if(exports.file.isDirFormat(dest)){
            outputFile = path.join(dest , path.basename(inputFile) );
            outputFile = outputFile.replace(options.extension, '.js');
        }

        exports.compileHandlebars(inputFile, outputFile, options);
    });
};

exports.compileHandlebars = function(inputFile, outputFile, options){
    var Handlebars = require('handlebars');
    // Convert the known list into a hash
    var known = {};
    if (options.known && !Array.isArray(options.known)) {
        options.known = [options.known];
    }
    if (options.known) {
        for (var i = 0, len = options.known.length; i < len; i++) {
            known[options.known[i]] = true;
        }
    }


    // template name
    var templateName = inputFile;
    // Clean the template name
    if (!options.root) {
        templateName = basename(templateName);
    } else if (templateName.indexOf(root) === 0) {
        templateName = templateName.substring(root.length+1);
    }
    templateName = templateName.replace(options.extension, '');

    // output stack
    var output = [];
    if (!options.simple) {
        if (options.amd) {
            output.push('define([\'' + options.handlebarPath + 'handlebars\'], function(Handlebars) {\n');
        } else if (options.commonjs) {
            output.push('var Handlebars = require("' + options.commonjs + '");');
        } else {
            output.push('(function() {\n');
        }
        output.push('  var template = Handlebars.template, templates = ');
        output.push(options.namespace);
        output.push(' = ');
        output.push(options.namespace);
        output.push(' || {};\n');
    }

    // compile 
    var code = exports.file.read(inputFile);
    var compilerOptions = {
        knownHelpers: known,
        knownHelpersOnly: options.knownOnly
    };
    // parse the handlebars template into it's AST
    var ast = Handlebars.parse(code);
    if(options.postParse) ast = options.postParse(ast);
    var compiled = Handlebars.precompile(ast, compilerOptions);


    if (options.simple) {
        output.push(compiled + '\n');
    } else if (options.partial) {
        if(options.amd && (options._.length == 1 && !fs.statSync(options._[0]).isDirectory())) {
            output.push('return ');
        }
        output.push('Handlebars.partials[\'' + templateName + '\'] = template(' + compiled + ');\n');
    } else {
        if(options.amd && (options._.length == 1 && !fs.statSync(options._[0]).isDirectory())) {
            output.push('return ');
        }
        output.push('templates[\'' + templateName + '\'] = template(' + compiled + ');\n');
    }


    // Output the content
    if (!options.simple) {
        if (options.amd) {
            if(options._.length > 1 || (options._.length == 1 && fs.statSync(options._[0]).isDirectory())) {
                if(options.partial){
                    output.push('return Handlebars.partials;\n');
                } else {
                    output.push('return templates;\n');
                }
            }
            output.push('});');
        } else if (!options.commonjs) {
            output.push('})();');
        }
    }
    output = output.join('');

    if (outputFile) {
        exports.file.write(outputFile, output);
        exports.log(inputFile, '>', outputFile);
    }

    return output;
    
}
