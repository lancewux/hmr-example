
var fs = require('fs');
var path = require('path');

var loadedModules = {};

var loadedExportObjs = {};

var loadedExportFuns = {};

var fileWatchers = {};

var RENodeModule = /^(?:.*[\\\/])?node_modules(?:[\\\/].*)?$/;

function parseOpts(opts) {
  var defaultOpts = {
    extenstions: ['.js'],
    ignoreNodeModules: true,
    matchFn: null
  }
  if (opts && opts.extenstions) {
    if (Array.isArray(opts.extenstions)) {
      defaultOpts.extenstions = opts.extenstions;
    } else if (typeof opts.extenstions === 'string') {
      defaultOpts.extenstions = [ opts.extenstions ];
    }
  }
  if (opts && opts.ignoreNodeModules) defaultOpts.ignoreNodeModules = true;
  if (opts && typeof opts.matchFn === 'function') defaultOpts.matchFn = opts.matchFn;

  return parsedOpts;
}

function match(filename, ext, matchFn, ignoreNodeModules) {
  if (typeof filename !== 'string') return false;
  if (ext.indexOf(path.extname(filename)) === -1) return false;

  var fullname = path.resolve(filename);
  if (ignoreNodeModules && RENodeModule.test(fullname)) return false;
  if (matchFn && typeof matchFn === 'function') return !!matchFn(fullname);
  return true;
}

function watchFile(filename) {
  console.log('##watchFile', filename);
  var watcher = fs.watch(filename, { persistent: false }, function () {
    // emitter.emit('change', filename);
    console.log('#filechange', filename);

    var loadedModule = loadedModules[filename];
    var parentModule = loadedModule.parent;
    console.log('#parentModule.id', parentModule.id)
    var children = parentModule.children;
    console.log('#children.length', children.length);
    for (var i = 0; i < children.length; i++) {
      console.log('children[i].id', children[i].id)
      if (children[i].id == filename) {
        console.log('##i', i);
        children.splice(i, 1);
        break;
      }
    }
    console.log('children.length', children.length);

    // console.log('#parentModule.require', parentModule.require);
    // console.log('#parentModule', parentModule);
    var exports = parentModule.require(filename);
    var type = typeof exports;
    console.log('#exports', type, exports);
    if (type === 'object') {
      Object.assign(loadedExportObjs[filename], exports);
      // _.assign(loadedExportObjs[filename], exports);
    } else if (type === 'function') {
      loadedExportFuns[filename] = exports;
      // _.assign(loadedExportObjs[filename], exports);
    }

    // copy_object(loadedExportObjs[filename], exports);
  });
  fileWatchers[filename] = watcher;
}

function unWatchFiles() {
  for (var filename in fileWatchers) {
    fileWatchers[filename].close();
  }
}

function hotUpdate(opts) {
  console.log('replace');
  var options = parseOpts(opts);
  var exts = options.extenstions;
  var matchFn = options.matchFn;
  var ignoreNodeModules = options.ignoreNodeModules;
  for (var i = 0; i < exts.length; i++) {
    var ext = exts[i];
    var oldExtFileLoader = require.extensions[ext];
    require.extensions[ext] = function extFileLoader(module, filename) {
      oldExtFileLoader(module, filename);
      if (!match(filename, ext, matchFn, ignoreNodeModules)) return;
      delete require.cache[filename];
      if (!loadedModules[filename]) {
        loadedModules[filename] = module;
        var type = typeof module.exports;
        console.log('#type', type);
        if (type === 'object') {
          loadedExportObjs[filename] = module.exports;
        } else if (type === 'function') { //必须包裹一层，不然没办法替换
          loadedExportFuns[filename] = module.exports;
          module.exports = function () {
            var args = Array.prototype.slice.call(arguments);
            return loadedExportFuns[filename].apply(module, args);
          }
        }
      }
      if (!fileWatchers[filename]) {
        watchFile(filename);
      }
    }
  }
  return unWatchFiles;
}

module.exports = hotUpdate