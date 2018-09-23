
var fs = require('fs');
var path = require('path');

var loadedModules = {};

var loadedExportObjs = {};

var loadedExportFuns = {};

var fileWatchers = {};

var options = {};

var oldExtFuns = {};

var RENodeModule = /^(?:.*[\\\/])?node_modules(?:[\\\/].*)?$/;

function setOptions(opts) {
  var curOpts = {
    extenstions: ['.js'],
    ignoreNodeModules: true,
    matchFn: null
  }
  if (opts && opts.extenstions) {
    if (Array.isArray(opts.extenstions)) {
      curOpts.extenstions = opts.extenstions;
    } else if (typeof opts.extenstions === 'string') {
      curOpts.extenstions = [opts.extenstions];
    }
  }
  if (opts && opts.ignoreNodeModules) curOpts.ignoreNodeModules = true;
  if (opts && typeof opts.matchFn === 'function') curOpts.matchFn = opts.matchFn;

  options = curOpts;
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
  console.log('### watchFile', filename);
  var watcher = fs.watch(filename, { persistent: false }, function () {
    // emitter.emit('change', filename);
    console.log('### filechange', filename);

    var loadedModule = loadedModules[filename];
    var parentModule = loadedModule.parent;
    // console.log('#parentModule.id', parentModule.id)
    var children = parentModule.children;
    // console.log('#children.length', children.length);
    for (var i = 0; i < children.length; i++) {
      // console.log('children[i].id', children[i].id)
      if (children[i].id == filename) {
        // console.log('##i', i);
        children.splice(i, 1);
        break;
      }
    }
    // console.log('children.length', children.length);

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

function registerExtension(ext) {
  var oldExtFun = oldExtFuns[ext] || oldExtFuns['.js'];
  var matchFn = options.matchFn;
  var ignoreNodeModules = options.ignoreNodeModules;
  require.extensions[ext] = function (m, filename) {
    oldExtFun(m, filename);
    if (match(filename, ext, matchFn, ignoreNodeModules)) {
      console.log('### match', filename);
      delete require.cache[filename];
      if (!loadedModules[filename]) {
        console.log('### !loadedModules[filename]', filename);
        loadedModules[filename] = m;
        var type = typeof m.exports;
        console.log('### type', type);
        if (type === 'object') {
          loadedExportObjs[filename] = m.exports;
        } else if (type === 'function') { //必须包裹一层，不然没办法替换
          loadedExportFuns[filename] = m.exports;
          m.exports = function () {
            var args = Array.prototype.slice.call(arguments);
            return loadedExportFuns[filename].apply(m, args);
          }
        }
      }
      if (!fileWatchers[filename]) {
        watchFile(filename);
      }
    }
  }
}

function hotUpdate(opts) {
  console.log('### replace');
  setOptions(opts);
  var exts = options.extenstions;
  exts.forEach(function (ext) {
    console.log('ext', ext);
    oldExtFuns[ext] = require.extensions[ext];
    registerExtension(ext);
  })
}

function hotUpdate1(opts) {
  console.log('### replace');


  var options = setOptions(opts);
  var exts = options.extenstions;
  var matchFn = options.matchFn;
  var ignoreNodeModules = options.ignoreNodeModules;
  for (var i = 0; i < exts.length; i++) {
    var ext = exts[i];
    var oldExtFileLoader = require.extensions[ext];
    require.extensions[ext] = function extFileLoader(module, filename) {
      oldExtFileLoader(module, filename);

      if (!match(filename, ext, matchFn, ignoreNodeModules)) {
        oldExtFileLoader(module, filename);
      } else {
        console.log('### require.extensions[ext]', filename);
        oldExtFileLoader(module, filename);
        // if (!match(filename, ext, matchFn, ignoreNodeModules)) return;
        console.log('### match', filename);

        delete require.cache[filename];
        if (!loadedModules[filename]) {
          console.log('### !loadedModules[filename]', filename);
          loadedModules[filename] = module;
          var type = typeof module.exports;
          console.log('### type', type);
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

  }
  console.log('### replace end');
  return unWatchFiles;


}

module.exports = hotUpdate