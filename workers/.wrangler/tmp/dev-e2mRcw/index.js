var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// .wrangler/tmp/bundle-9vnSkn/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// node_modules/wrangler/_virtual_unenv_global_polyfill-clear$immediate.js
globalThis.clearImmediate = clearImmediateFallback;

// node_modules/unenv/runtime/_internal/utils.mjs
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
function notImplemented(name) {
  const fn2 = () => {
    throw createNotImplementedError(name);
  };
  return Object.assign(fn2, { __unenv__: true });
}

// node_modules/unenv/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/runtime/node/timers/internal/immediate.mjs
var Immediate = class {
  _onImmediate;
  _timeout;
  constructor(callback, args) {
    this._onImmediate = callback;
    if ("setTimeout" in globalThis) {
      this._timeout = setTimeout(callback, 0, ...args);
    } else {
      callback(...args);
    }
  }
  ref() {
    this._timeout?.ref();
    return this;
  }
  unref() {
    this._timeout?.unref();
    return this;
  }
  hasRef() {
    return this._timeout?.hasRef() ?? false;
  }
  [Symbol.dispose]() {
    if ("clearTimeout" in globalThis) {
      clearTimeout(this._timeout);
    }
  }
};

// node_modules/unenv/runtime/node/timers/internal/set-immediate.mjs
function setImmediateFallbackPromises(value) {
  return new Promise((res) => {
    res(value);
  });
}
function setImmediateFallback(callback, ...args) {
  return new Immediate(callback, args);
}
setImmediateFallback.__promisify__ = setImmediateFallbackPromises;
function clearImmediateFallback(immediate) {
  immediate?.[Symbol.dispose]();
}

// node_modules/wrangler/_virtual_unenv_global_polyfill-set$immediate.js
globalThis.setImmediate = setImmediateFallback;

// node_modules/unenv/runtime/node/console/index.mjs
import { Writable } from "node:stream";

// node_modules/unenv/runtime/mock/proxy.mjs
var fn = function() {
};
function createMock(name, overrides = {}) {
  fn.prototype.name = name;
  const props = {};
  return new Proxy(fn, {
    get(_target, prop) {
      if (prop === "caller") {
        return null;
      }
      if (prop === "__createMock__") {
        return createMock;
      }
      if (prop === "__unenv__") {
        return true;
      }
      if (prop in overrides) {
        return overrides[prop];
      }
      return props[prop] = props[prop] || createMock(`${name}.${prop.toString()}`);
    },
    apply(_target, _this, _args) {
      return createMock(`${name}()`);
    },
    construct(_target, _args, _newT) {
      return createMock(`[${name}]`);
    },
    // @ts-ignore (ES6-only - removed in ES7)
    // https://github.com/tc39/ecma262/issues/161
    enumerate() {
      return [];
    }
  });
}
var proxy_default = createMock("mock");

// node_modules/unenv/runtime/node/console/index.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? notImplemented("console.createTask");
var assert = notImplemented("console.assert");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? proxy_default.__createMock__("console.Console");

// node_modules/unenv/runtime/node/console/$cloudflare.mjs
var workerdConsole = globalThis["console"];
var {
  assert: assert2,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler: noop_default,
  _stdout,
  _stdoutErrorHandler: noop_default,
  _times: proxy_default
});
var cloudflare_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-console.js
globalThis.console = cloudflare_default;

// node_modules/unenv/runtime/web/performance/_entry.mjs
var _supportedEntryTypes = [
  "event",
  // PerformanceEntry
  "mark",
  // PerformanceMark
  "measure",
  // PerformanceMeasure
  "resource"
  // PerformanceResourceTiming
];
var _PerformanceEntry = class {
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || performance.now();
    this.detail = options?.detail;
  }
  get duration() {
    return performance.now() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceEntry = globalThis.PerformanceEntry || _PerformanceEntry;
var _PerformanceMark = class extends _PerformanceEntry {
  entryType = "mark";
};
var PerformanceMark = globalThis.PerformanceMark || _PerformanceMark;
var _PerformanceMeasure = class extends _PerformanceEntry {
  entryType = "measure";
};
var PerformanceMeasure = globalThis.PerformanceMeasure || _PerformanceMeasure;
var _PerformanceResourceTiming = class extends _PerformanceEntry {
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
};
var PerformanceResourceTiming = globalThis.PerformanceResourceTiming || _PerformanceResourceTiming;

// node_modules/unenv/runtime/web/performance/_performance.mjs
var _timeOrigin = Date.now();
var _Performance = class {
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = proxy_default.__createMock__("PerformanceNavigation");
  timing = proxy_default.__createMock__("PerformanceTiming");
  onresourcetimingbufferfull = null;
  now() {
    if (globalThis?.performance?.now && this.timeOrigin === _timeOrigin) {
      return globalThis.performance.now();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter(
      (e) => e.entryType !== "resource" || e.entryType !== "navigation"
    );
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter(
      (e) => e.name === name && (!type || e.entryType === type)
    );
  }
  getEntriesByType(type) {
    return this._entries.filter(
      (e) => e.entryType === type
    );
  }
  mark(name, options) {
    const entry = new _PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || performance2.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || performance2.now();
    }
    const entry = new _PerformanceMeasure(measureName, {
      startTime: start,
      detail: { start, end }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  toJSON() {
    return this;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
};
var Performance = globalThis.Performance || _Performance;
var performance2 = globalThis.performance || new Performance();

// node_modules/unenv/runtime/web/performance/_observer.mjs
var _PerformanceObserver = class {
  __unenv__ = true;
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
};
__publicField(_PerformanceObserver, "supportedEntryTypes", _supportedEntryTypes);
var PerformanceObserver = globalThis.PerformanceObserver || _PerformanceObserver;
var _PerformanceObserverEntryList = class {
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var PerformanceObserverEntryList = globalThis.PerformanceObserverEntryList || _PerformanceObserverEntryList;

// node_modules/unenv/runtime/polyfill/global-this.mjs
function getGlobal() {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  return {};
}
var global_this_default = getGlobal();

// node_modules/unenv/runtime/polyfill/performance.mjs
global_this_default.performance = global_this_default.performance || performance2;
global_this_default.Performance = global_this_default.Performance || Performance;
global_this_default.PerformanceEntry = global_this_default.PerformanceEntry || PerformanceEntry;
global_this_default.PerformanceMark = global_this_default.PerformanceMark || PerformanceMark;
global_this_default.PerformanceMeasure = global_this_default.PerformanceMeasure || PerformanceMeasure;
global_this_default.PerformanceObserver = global_this_default.PerformanceObserver || PerformanceObserver;
global_this_default.PerformanceObserverEntryList = global_this_default.PerformanceObserverEntryList || PerformanceObserverEntryList;
global_this_default.PerformanceResourceTiming = global_this_default.PerformanceResourceTiming || PerformanceResourceTiming;
var performance_default = global_this_default.performance;

// node_modules/wrangler/_virtual_unenv_global_polyfill-performance.js
globalThis.performance = performance_default;

// node_modules/unenv/runtime/mock/empty.mjs
var empty_default = Object.freeze(
  Object.create(null, {
    __unenv__: { get: () => true }
  })
);

// node_modules/unenv/runtime/node/process/internal/env.mjs
var _envShim = /* @__PURE__ */ Object.create(null);
var _processEnv = globalThis.process?.env;
var _getEnv = (useShim) => _processEnv || globalThis.__env__ || (useShim ? _envShim : globalThis);
var env = new Proxy(_envShim, {
  get(_, prop) {
    const env22 = _getEnv();
    return env22[prop] ?? _envShim[prop];
  },
  has(_, prop) {
    const env22 = _getEnv();
    return prop in env22 || prop in _envShim;
  },
  set(_, prop, value) {
    const env22 = _getEnv(true);
    env22[prop] = value;
    return true;
  },
  deleteProperty(_, prop) {
    const env22 = _getEnv(true);
    delete env22[prop];
    return true;
  },
  ownKeys() {
    const env22 = _getEnv();
    return Object.keys(env22);
  }
});

// node_modules/unenv/runtime/node/process/internal/time.mjs
var hrtime = Object.assign(
  function hrtime2(startTime) {
    const now = Date.now();
    const seconds = Math.trunc(now / 1e3);
    const nanos = now % 1e3 * 1e6;
    if (startTime) {
      let diffSeconds = seconds - startTime[0];
      let diffNanos = nanos - startTime[0];
      if (diffNanos < 0) {
        diffSeconds = diffSeconds - 1;
        diffNanos = 1e9 + diffNanos;
      }
      return [diffSeconds, diffNanos];
    }
    return [seconds, nanos];
  },
  {
    bigint: function bigint() {
      return BigInt(Date.now() * 1e6);
    }
  }
);
var nextTick = globalThis.queueMicrotask ? (cb, ...args) => {
  globalThis.queueMicrotask(cb.bind(void 0, ...args));
} : _createNextTickWithTimeout();
function _createNextTickWithTimeout() {
  let queue = [];
  let draining = false;
  let currentQueue;
  let queueIndex = -1;
  function cleanUpNextTick() {
    if (!draining || !currentQueue) {
      return;
    }
    draining = false;
    if (currentQueue.length > 0) {
      queue = [...currentQueue, ...queue];
    } else {
      queueIndex = -1;
    }
    if (queue.length > 0) {
      drainQueue();
    }
  }
  function drainQueue() {
    if (draining) {
      return;
    }
    const timeout = setTimeout(cleanUpNextTick);
    draining = true;
    let len = queue.length;
    while (len) {
      currentQueue = queue;
      queue = [];
      while (++queueIndex < len) {
        if (currentQueue) {
          currentQueue[queueIndex]();
        }
      }
      queueIndex = -1;
      len = queue.length;
    }
    currentQueue = void 0;
    draining = false;
    clearTimeout(timeout);
  }
  const nextTick22 = (cb, ...args) => {
    queue.push(cb.bind(void 0, ...args));
    if (queue.length === 1 && !draining) {
      setTimeout(drainQueue);
    }
  };
  return nextTick22;
}

// node_modules/unenv/runtime/node/process/internal/process.mjs
var title = "unenv";
var argv = [];
var version = "";
var versions = {
  ares: "",
  http_parser: "",
  icu: "",
  modules: "",
  node: "",
  openssl: "",
  uv: "",
  v8: "",
  zlib: ""
};
function noop() {
  return process;
}
var on = noop;
var addListener = noop;
var once = noop;
var off = noop;
var removeListener = noop;
var removeAllListeners = noop;
var emit = function emit2(event) {
  if (event === "message" || event === "multipleResolves") {
    return process;
  }
  return false;
};
var prependListener = noop;
var prependOnceListener = noop;
var listeners = function(name) {
  return [];
};
var listenerCount = () => 0;
var binding = function(name) {
  throw new Error("[unenv] process.binding is not supported");
};
var _cwd = "/";
var cwd = function cwd2() {
  return _cwd;
};
var chdir = function chdir2(dir3) {
  _cwd = dir3;
};
var umask = function umask2() {
  return 0;
};
var getegid = function getegid2() {
  return 1e3;
};
var geteuid = function geteuid2() {
  return 1e3;
};
var getgid = function getgid2() {
  return 1e3;
};
var getuid = function getuid2() {
  return 1e3;
};
var getgroups = function getgroups2() {
  return [];
};
var getBuiltinModule = (_name) => void 0;
var abort = notImplemented("process.abort");
var allowedNodeEnvironmentFlags = /* @__PURE__ */ new Set();
var arch = "";
var argv0 = "";
var config = empty_default;
var connected = false;
var constrainedMemory = () => 0;
var availableMemory = () => 0;
var cpuUsage = notImplemented("process.cpuUsage");
var debugPort = 0;
var dlopen = notImplemented("process.dlopen");
var disconnect = noop;
var emitWarning = noop;
var eventNames = notImplemented("process.eventNames");
var execArgv = [];
var execPath = "";
var exit = notImplemented("process.exit");
var features = /* @__PURE__ */ Object.create({
  inspector: void 0,
  debug: void 0,
  uv: void 0,
  ipv6: void 0,
  tls_alpn: void 0,
  tls_sni: void 0,
  tls_ocsp: void 0,
  tls: void 0,
  cached_builtins: void 0
});
var getActiveResourcesInfo = () => [];
var getMaxListeners = notImplemented(
  "process.getMaxListeners"
);
var kill = notImplemented("process.kill");
var memoryUsage = Object.assign(
  () => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }),
  { rss: () => 0 }
);
var pid = 1e3;
var platform = "";
var ppid = 1e3;
var rawListeners = notImplemented(
  "process.rawListeners"
);
var release = /* @__PURE__ */ Object.create({
  name: "",
  lts: "",
  sourceUrl: void 0,
  headersUrl: void 0
});
var report = /* @__PURE__ */ Object.create({
  compact: void 0,
  directory: void 0,
  filename: void 0,
  getReport: notImplemented("process.report.getReport"),
  reportOnFatalError: void 0,
  reportOnSignal: void 0,
  reportOnUncaughtException: void 0,
  signal: void 0,
  writeReport: notImplemented("process.report.writeReport")
});
var resourceUsage = notImplemented(
  "process.resourceUsage"
);
var setegid = notImplemented("process.setegid");
var seteuid = notImplemented("process.seteuid");
var setgid = notImplemented("process.setgid");
var setgroups = notImplemented("process.setgroups");
var setuid = notImplemented("process.setuid");
var setMaxListeners = notImplemented(
  "process.setMaxListeners"
);
var setSourceMapsEnabled = notImplemented("process.setSourceMapsEnabled");
var stdout = proxy_default.__createMock__("process.stdout");
var stderr = proxy_default.__createMock__("process.stderr");
var stdin = proxy_default.__createMock__("process.stdin");
var traceDeprecation = false;
var uptime = () => 0;
var exitCode = 0;
var setUncaughtExceptionCaptureCallback = notImplemented("process.setUncaughtExceptionCaptureCallback");
var hasUncaughtExceptionCaptureCallback = () => false;
var sourceMapsEnabled = false;
var loadEnvFile = notImplemented(
  "process.loadEnvFile"
);
var mainModule = void 0;
var permission = {
  has: () => false
};
var channel = {
  ref() {
  },
  unref() {
  }
};
var throwDeprecation = false;
var assert3 = notImplemented("process.assert");
var openStdin = notImplemented("process.openStdin");
var _debugEnd = notImplemented("process._debugEnd");
var _debugProcess = notImplemented("process._debugProcess");
var _fatalException = notImplemented("process._fatalException");
var _getActiveHandles = notImplemented("process._getActiveHandles");
var _getActiveRequests = notImplemented("process._getActiveRequests");
var _kill = notImplemented("process._kill");
var _preload_modules = [];
var _rawDebug = notImplemented("process._rawDebug");
var _startProfilerIdleNotifier = notImplemented(
  "process._startProfilerIdleNotifier"
);
var _stopProfilerIdleNotifier = notImplemented(
  "process.__stopProfilerIdleNotifier"
);
var _tickCallback = notImplemented("process._tickCallback");
var _linkedBinding = notImplemented("process._linkedBinding");
var domain = proxy_default.__createMock__("process.domain");
var initgroups = notImplemented("process.initgroups");
var moduleLoadList = [];
var reallyExit = noop;
var _exiting = false;
var _events = [];
var _eventsCount = 0;
var _maxListeners = 0;
var process = {
  // @ts-expect-error
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  exitCode,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  throwDeprecation,
  mainModule,
  permission,
  channel,
  arch,
  argv,
  argv0,
  assert: assert3,
  binding,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  features,
  getBuiltinModule,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  openStdin,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions
};

// node_modules/unenv/runtime/node/process/$cloudflare.mjs
var unpatchedGlobalThisProcess = globalThis["process"];
var getBuiltinModule2 = unpatchedGlobalThisProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule2("node:process");
var { env: env2, nextTick: nextTick2 } = workerdProcess;
var _process = {
  /**
   * manually unroll unenv-polyfilled-symbols to make it tree-shakeable
   */
  // @ts-expect-error (not typed)
  _debugEnd,
  _debugProcess,
  // TODO: implemented yet in unenv
  //_events,
  _eventsCount,
  // TODO: implemented yet in unenv
  //_exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  // TODO: implemented yet in unenv
  //_linkedBinding,
  // TODO: implemented yet in unenv
  //_maxListeners,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert3,
  availableMemory,
  binding,
  chdir,
  config,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  // TODO: implemented yet in unenv
  //domain,
  emit,
  emitWarning,
  eventNames,
  execArgv,
  execPath,
  exit,
  exitCode,
  features,
  getActiveResourcesInfo,
  getMaxListeners,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime,
  // TODO: implemented yet in unenv
  //initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  memoryUsage,
  // TODO: implemented yet in unenv
  //moduleLoadList,
  off,
  on,
  once,
  // TODO: implemented yet in unenv
  //openStdin,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  // TODO: implemented yet in unenv
  //reallyExit,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  setUncaughtExceptionCaptureCallback,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  umask,
  uptime,
  version,
  versions,
  /**
   * manually unroll workerd-polyfilled-symbols to make it tree-shakeable
   */
  env: env2,
  getBuiltinModule: getBuiltinModule2,
  nextTick: nextTick2
};
var cloudflare_default2 = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-process.js
globalThis.process = cloudflare_default2;

// src/middleware/cors.ts
var ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://thitong.site",
  "https://www.thitong.site",
  "https://itongquiz1.vercel.app"
];
function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Token",
    "Access-Control-Max-Age": "86400"
  };
}
function handleCors(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request)
    });
  }
  return null;
}

// src/middleware/auth.ts
function verifyToken(request, env3) {
  if (request.method === "OPTIONS")
    return null;
  const headerToken = request.headers.get("X-API-Token") || request.headers.get("Authorization")?.replace("Bearer ", "");
  if (headerToken === env3.API_SECRET_TOKEN)
    return null;
  return null;
}

// src/utils/response.ts
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
function errorResponse(message, status = 400) {
  return jsonResponse({ status: "error", message }, status);
}

// src/routes/teachers.ts
async function handleTeacherRoutes(request, env3, path, method) {
  return errorResponse("Use legacy POST endpoint for now", 501);
}

// src/routes/quizzes.ts
async function handleQuizRoutes(request, env3, path, method) {
  return errorResponse("Use legacy POST endpoint for now", 501);
}

// src/routes/results.ts
async function handleResultRoutes(request, env3, path, method) {
  return errorResponse("Use legacy POST endpoint for now", 501);
}

// src/routes/classroom.ts
async function handleClassroomRoutes(request, env3, path, method) {
  return errorResponse("Use legacy POST endpoint for now", 501);
}

// src/routes/gamification.ts
async function handleGamificationRoutes(request, env3, path, method) {
  return errorResponse("Use legacy POST endpoint for now", 501);
}

// src/routes/announcements.ts
async function handleAnnouncementRoutes(request, env3, path, method) {
  return errorResponse("Use legacy POST endpoint for now", 501);
}

// src/index.ts
var src_default = {
  async fetch(request, env3) {
    const corsResponse = handleCors(request);
    if (corsResponse)
      return corsResponse;
    const authError = verifyToken(request, env3);
    if (authError)
      return addCors(authError, request);
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;
      if (method === "POST" && (path === "/" || path === "/api/gas")) {
        return addCors(await handleLegacyGasRequest(request, env3), request);
      }
      let response = null;
      if (path.startsWith("/api/teachers") || path === "/api/login") {
        response = await handleTeacherRoutes(request, env3, path, method);
      } else if (path.startsWith("/api/quizzes") || path.startsWith("/api/questions")) {
        response = await handleQuizRoutes(request, env3, path, method);
      } else if (path.startsWith("/api/results") || path === "/api/validate") {
        response = await handleResultRoutes(request, env3, path, method);
      } else if (path.startsWith("/api/classes") || path.startsWith("/api/students") || path.startsWith("/api/assignments") || path === "/api/student-login") {
        response = await handleClassroomRoutes(request, env3, path, method);
      } else if (path.startsWith("/api/pets") || path.startsWith("/api/game-state") || path.startsWith("/api/shop") || path.startsWith("/api/leaderboard")) {
        response = await handleGamificationRoutes(request, env3, path, method);
      } else if (path.startsWith("/api/announcements")) {
        response = await handleAnnouncementRoutes(request, env3, path, method);
      } else if (path === "/api/health") {
        response = jsonResponse({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
      }
      if (response)
        return addCors(response, request);
      return addCors(errorResponse("Not found: " + path, 404), request);
    } catch (error3) {
      console.error("Worker error:", error3);
      return addCors(errorResponse(error3.message || "Internal server error", 500), request);
    }
  }
};
function addCors(response, request) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
async function handleLegacyGasRequest(request, env3) {
  let body = {};
  try {
    const text = await request.text();
    body = JSON.parse(text);
  } catch {
    return errorResponse("Invalid JSON body");
  }
  if (body.token !== env3.API_SECRET_TOKEN) {
    return errorResponse("Unauthorized: Invalid Token", 401);
  }
  const action = body.action;
  const db = env3.DB;
  switch (action) {
    case "get_teachers": {
      const rows = await db.prepare("SELECT * FROM teachers").all();
      return jsonResponse(rows.results);
    }
    case "get_quizzes": {
      const rows = await db.prepare("SELECT * FROM quizzes").all();
      return jsonResponse(rows.results);
    }
    case "get_questions": {
      const rows = await db.prepare("SELECT * FROM questions").all();
      return jsonResponse(rows.results);
    }
    case "create_quiz": {
      await db.prepare(
        `INSERT INTO quizzes (id, title, class_level, category, time_limit, created_at, access_code, require_code, created_by, show_on_home)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        body.id,
        body.title,
        body.classLevel,
        body.category || "",
        body.timeLimit,
        body.createdAt,
        body.accessCode || "",
        body.requireCode ? "TRUE" : "FALSE",
        body.createdBy || "",
        body.showOnHome === false ? "FALSE" : "TRUE"
      ).run();
      if (body.questions && Array.isArray(body.questions)) {
        const stmt = db.prepare(
          `INSERT INTO questions (id, quiz_id, type, question, options, correct_answer, items, text_field, blanks, distractors, sentence, words, correct_word_indexes, image)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        const batch = body.questions.map((q) => {
          const mapped = mapQuestionForSave(q, body.id);
          return stmt.bind(...mapped);
        });
        await db.batch(batch);
      }
      return jsonResponse({ status: "success" });
    }
    case "update_quiz": {
      if (!body.id)
        return errorResponse("Missing quiz ID");
      await db.prepare("DELETE FROM questions WHERE quiz_id = ?").bind(body.id).run();
      await db.prepare("DELETE FROM quizzes WHERE id = ?").bind(body.id).run();
      await db.prepare(
        `INSERT INTO quizzes (id, title, class_level, category, time_limit, created_at, access_code, require_code, created_by, show_on_home)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        body.id,
        body.title,
        body.classLevel,
        body.category || "",
        body.timeLimit,
        body.createdAt,
        body.accessCode || "",
        body.requireCode ? "TRUE" : "FALSE",
        body.createdBy || "",
        body.showOnHome === false ? "FALSE" : "TRUE"
      ).run();
      if (body.questions && Array.isArray(body.questions)) {
        const stmt = db.prepare(
          `INSERT INTO questions (id, quiz_id, type, question, options, correct_answer, items, text_field, blanks, distractors, sentence, words, correct_word_indexes, image)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        const batch = body.questions.map((q) => {
          const mapped = mapQuestionForSave(q, body.id);
          return stmt.bind(...mapped);
        });
        await db.batch(batch);
      }
      const countResult = await db.prepare("SELECT COUNT(*) as cnt FROM questions WHERE quiz_id = ?").bind(body.id).first();
      const actualCount = countResult?.cnt || 0;
      const expectedCount = body.questions?.length || 0;
      if (actualCount !== expectedCount) {
        return jsonResponse({ status: "error", message: `Save verification failed: expected ${expectedCount} questions, but ${actualCount} were saved` });
      }
      return jsonResponse({ status: "success", questionCount: actualCount });
    }
    case "delete_quiz": {
      await db.prepare("DELETE FROM questions WHERE quiz_id = ?").bind(body.quizId).run();
      await db.prepare("DELETE FROM quizzes WHERE id = ?").bind(body.quizId).run();
      return jsonResponse({ status: "success" });
    }
    case "get_results": {
      const rows = await db.prepare("SELECT * FROM results ORDER BY submitted_at DESC").all();
      const mapped = rows.results.map((r) => ({
        "Student Name": r.student_name,
        "Class": r.class_name,
        "Quiz ID": r.quiz_id,
        "Quiz Title": r.quiz_title,
        "Score": r.score,
        "correctCount": r.correct_count,
        "Total Questions": r.total_questions,
        "Submitted At": r.submitted_at,
        "answers": r.answers
      }));
      return jsonResponse(mapped);
    }
    case "submit_result": {
      await db.prepare(
        `INSERT INTO results (student_name, class_name, quiz_id, quiz_title, score, correct_count, total_questions, submitted_at, answers)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        body.studentName || "",
        body.className || "",
        body.quizId || "",
        body.quizTitle || "",
        body.score || 0,
        body.correctCount || 0,
        body.totalQuestions || 0,
        body.submittedAt || (/* @__PURE__ */ new Date()).toISOString(),
        JSON.stringify(body.answers || {})
      ).run();
      return jsonResponse({ status: "success" });
    }
    case "validate_answers": {
      return await handleValidateAnswers(db, body);
    }
    case "get_announcement": {
      const row = await db.prepare("SELECT * FROM announcements WHERE id = ?").bind("1").first();
      if (!row) {
        return jsonResponse({ status: "success", announcement: null });
      }
      return jsonResponse({
        status: "success",
        announcement: {
          id: row.id,
          content: row.content || "",
          isActive: row.is_active === "true" || row.is_active === "TRUE",
          updatedAt: row.updated_at
        }
      });
    }
    case "save_announcement": {
      const existing = await db.prepare("SELECT id FROM announcements WHERE id = ?").bind("1").first();
      if (existing) {
        await db.prepare(
          `UPDATE announcements SET content = ?, is_active = ?, updated_at = ? WHERE id = ?`
        ).bind(body.content || "", body.isActive ? "true" : "false", (/* @__PURE__ */ new Date()).toISOString(), "1").run();
      } else {
        await db.prepare(
          `INSERT INTO announcements (id, content, is_active, updated_at) VALUES (?, ?, ?, ?)`
        ).bind("1", body.content || "", body.isActive ? "true" : "false", (/* @__PURE__ */ new Date()).toISOString()).run();
      }
      return jsonResponse({ status: "success", message: "Announcement saved successfully" });
    }
    case "get_classes": {
      let query = "SELECT * FROM classes";
      const params = [];
      if (body.teacherUsername) {
        query += " WHERE teacher_username = ?";
        params.push(body.teacherUsername);
      }
      const rows = await db.prepare(query).bind(...params).all();
      return jsonResponse({ status: "success", data: rows.results.map((r) => ({ id: r.id, name: r.name, teacherUsername: r.teacher_username, createdAt: r.created_at })) });
    }
    case "create_class": {
      const id = `c-${crypto.randomUUID().substring(0, 8)}`;
      const createdAt = (/* @__PURE__ */ new Date()).toISOString();
      await db.prepare("INSERT INTO classes (id, name, teacher_username, created_at) VALUES (?, ?, ?, ?)").bind(id, body.name, body.teacherUsername, createdAt).run();
      return jsonResponse({ status: "success", data: { id, name: body.name, teacherUsername: body.teacherUsername, createdAt } });
    }
    case "delete_class": {
      await db.prepare("DELETE FROM students WHERE class_id = ?").bind(body.classId).run();
      await db.prepare("DELETE FROM assignments WHERE class_id = ?").bind(body.classId).run();
      await db.prepare("DELETE FROM classes WHERE id = ?").bind(body.classId).run();
      return jsonResponse({ status: "success" });
    }
    case "get_students": {
      const students = await db.prepare("SELECT * FROM students WHERE class_id = ?").bind(body.classId).all();
      const mapped = students.results.map((s) => {
        const base = { id: s.id, fullName: s.full_name, username: s.username, classId: s.class_id, avatar: s.avatar || "" };
        if (body.role !== "student") {
          base.parentPhone = s.parent_phone || "";
          base.createdAt = s.created_at;
        }
        return base;
      });
      return jsonResponse({ status: "success", data: mapped });
    }
    case "add_student": {
      const existing = await db.prepare("SELECT id FROM students WHERE username = ?").bind(body.username).first();
      if (existing)
        return jsonResponse({ status: "error", message: "T\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 t\u1ED3n t\u1EA1i: " + body.username });
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(body.password));
      const pwdHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
      const sId = `s-${crypto.randomUUID().substring(0, 8)}`;
      const createdAt = (/* @__PURE__ */ new Date()).toISOString();
      await db.prepare(
        "INSERT INTO students (id, full_name, username, password_hash, class_id, parent_phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(sId, body.fullName, body.username, pwdHash, body.classId, body.parentPhone || "", createdAt).run();
      return jsonResponse({ status: "success", data: { id: sId, fullName: body.fullName, username: body.username, classId: body.classId, parentPhone: body.parentPhone || "", createdAt } });
    }
    case "delete_student": {
      await db.prepare("DELETE FROM students WHERE id = ?").bind(body.studentId).run();
      return jsonResponse({ status: "success" });
    }
    case "reset_student_password": {
      const chars = "abcdefghjkmnpqrstuvwxyz23456789";
      let newPwd = "";
      for (let i = 0; i < 6; i++)
        newPwd += chars.charAt(Math.floor(Math.random() * chars.length));
      const enc = new TextEncoder();
      const hBuf = await crypto.subtle.digest("SHA-256", enc.encode(newPwd));
      const hash = Array.from(new Uint8Array(hBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      await db.prepare("UPDATE students SET password_hash = ? WHERE id = ?").bind(hash, body.studentId).run();
      return jsonResponse({ status: "success", data: { newPassword: newPwd } });
    }
    case "student_login": {
      const enc = new TextEncoder();
      const hBuf = await crypto.subtle.digest("SHA-256", enc.encode(body.password));
      const inputHash = Array.from(new Uint8Array(hBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      const student = await db.prepare("SELECT * FROM students WHERE username = ? AND password_hash = ?").bind(body.username, inputHash).first();
      if (!student)
        return jsonResponse({ status: "error", message: "Sai t\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u." });
      const cls = await db.prepare("SELECT name FROM classes WHERE id = ?").bind(student.class_id).first();
      const pet = await db.prepare("SELECT * FROM user_pets WHERE username = ?").bind(student.username).first();
      const shopItems = await db.prepare("SELECT * FROM shop_items").all();
      if (pet) {
        await db.prepare("UPDATE user_pets SET last_active = ?, mood = ? WHERE username = ?").bind((/* @__PURE__ */ new Date()).toISOString(), "happy", student.username).run();
      }
      const petData = pet ? {
        petId: pet.pet_id,
        petName: pet.pet_name,
        level: Number(pet.level) || 1,
        exp: Number(pet.exp) || 0,
        expToNext: Number(pet.exp_to_next) || 100,
        mood: pet.mood || "happy",
        items: pet.items ? JSON.parse(pet.items) : [],
        lastActive: pet.last_active || "",
        imageUrl: pet.image_url || ""
      } : null;
      return jsonResponse({
        status: "success",
        data: {
          studentId: student.id,
          fullName: student.full_name,
          username: student.username,
          classId: student.class_id,
          className: cls?.name || "",
          avatar: student.avatar || "",
          coins: Number(student.coins) || 0,
          pet: petData,
          shopItems: shopItems.results.map((i) => ({
            itemId: i.item_id,
            name: i.name,
            price: Number(i.price) || 0,
            type: i.type || "ACCESSORY",
            category: i.category || "",
            assetUrl: i.asset_url || ""
          }))
        }
      });
    }
    case "update_student_avatar": {
      await db.prepare("UPDATE students SET avatar = ? WHERE id = ?").bind(body.avatar || "", body.studentId).run();
      return jsonResponse({ status: "success", data: { avatar: body.avatar } });
    }
    case "get_assignments": {
      await db.prepare(`UPDATE assignments SET status = 'CLOSED' WHERE status = 'OPEN' AND deadline < ?`).bind((/* @__PURE__ */ new Date()).toISOString()).run();
      const rows = await db.prepare("SELECT * FROM assignments WHERE class_id = ?").bind(body.classId).all();
      return jsonResponse({ status: "success", data: mapAssignments(rows.results) });
    }
    case "get_teacher_assignments": {
      await db.prepare(`UPDATE assignments SET status = 'CLOSED' WHERE status = 'OPEN' AND deadline < ?`).bind((/* @__PURE__ */ new Date()).toISOString()).run();
      const teacherClasses = await db.prepare("SELECT id, name FROM classes WHERE teacher_username = ?").bind(body.teacherUsername).all();
      const classIds = teacherClasses.results.map((c) => c.id);
      if (classIds.length === 0)
        return jsonResponse({ status: "success", data: [] });
      const placeholders = classIds.map(() => "?").join(",");
      const assignments = await db.prepare(`SELECT a.*, c.name as class_name FROM assignments a LEFT JOIN classes c ON a.class_id = c.id WHERE a.class_id IN (${placeholders})`).bind(...classIds).all();
      const mapped = assignments.results.map((a) => ({
        ...mapAssignment(a),
        className: a.class_name || ""
      }));
      return jsonResponse({ status: "success", data: mapped });
    }
    case "get_all_assignments": {
      await db.prepare(`UPDATE assignments SET status = 'CLOSED' WHERE status = 'OPEN' AND deadline < ?`).bind((/* @__PURE__ */ new Date()).toISOString()).run();
      const all = await db.prepare(`
        SELECT a.*, c.name as class_name, q.title as quiz_title
        FROM assignments a
        LEFT JOIN classes c ON a.class_id = c.id
        LEFT JOIN quizzes q ON a.quiz_id = q.id
      `).all();
      const mapped = all.results.map((a) => ({
        ...mapAssignment(a),
        className: a.class_name || "",
        quizTitle: a.quiz_title || "B\xE0i t\u1EADp"
      }));
      return jsonResponse({ status: "success", data: mapped });
    }
    case "get_student_assignments": {
      const stu = await db.prepare("SELECT * FROM students WHERE id = ?").bind(body.studentId).first();
      if (!stu)
        return jsonResponse({ status: "error", message: "Student not found" });
      await db.prepare(`UPDATE assignments SET status = 'CLOSED' WHERE status = 'OPEN' AND deadline < ?`).bind((/* @__PURE__ */ new Date()).toISOString()).run();
      const asns = await db.prepare(
        `SELECT * FROM assignments WHERE class_id = ? AND (student_id = '' OR student_id = ?)`
      ).bind(stu.class_id, stu.id).all();
      const mapped = [];
      for (const a of asns.results) {
        const countResult = await db.prepare(
          `SELECT COUNT(*) as cnt FROM results WHERE student_name = ? AND quiz_id = ? AND answers != '{"status":"STARTED"}'`
        ).bind(stu.full_name, a.quiz_id).first();
        mapped.push({
          ...mapAssignment(a),
          attemptCount: countResult?.cnt || 0,
          maxAttempts: Number(a.max_attempts) || 1
        });
      }
      return jsonResponse({ status: "success", data: mapped });
    }
    case "create_assignment": {
      const aId = `a-${crypto.randomUUID().substring(0, 8)}`;
      const createdAt = (/* @__PURE__ */ new Date()).toISOString();
      await db.prepare(
        "INSERT INTO assignments (id, quiz_id, class_id, student_id, deadline, max_attempts, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(aId, body.quizId, body.classId, body.studentId || "", body.deadline, Number(body.maxAttempts) || 1, "OPEN", createdAt).run();
      return jsonResponse({ status: "success", data: { id: aId, quizId: body.quizId, classId: body.classId, studentId: body.studentId || "", deadline: body.deadline, maxAttempts: Number(body.maxAttempts) || 1, status: "OPEN", createdAt } });
    }
    case "delete_assignment": {
      await db.prepare("DELETE FROM assignments WHERE id = ?").bind(body.assignmentId).run();
      return jsonResponse({ status: "success" });
    }
    case "update_assignment_deadline": {
      const newDeadline = new Date(body.newDeadline);
      const newStatus = newDeadline > /* @__PURE__ */ new Date() ? "OPEN" : void 0;
      if (newStatus) {
        await db.prepare("UPDATE assignments SET deadline = ?, status = ? WHERE id = ?").bind(body.newDeadline, newStatus, body.assignmentId).run();
      } else {
        await db.prepare("UPDATE assignments SET deadline = ? WHERE id = ?").bind(body.newDeadline, body.assignmentId).run();
      }
      return jsonResponse({ status: "success", data: { assignmentId: body.assignmentId, newDeadline: body.newDeadline, status: newStatus || "CLOSED" } });
    }
    case "update_assignment_status": {
      const s = body.newStatus || "CLOSED";
      await db.prepare("UPDATE assignments SET status = ? WHERE id = ?").bind(s, body.assignmentId).run();
      return jsonResponse({ status: "success", data: { assignmentId: body.assignmentId, status: s } });
    }
    case "start_assignment_attempt": {
      const stu2 = await db.prepare("SELECT * FROM students WHERE id = ?").bind(body.studentId).first();
      if (!stu2)
        return jsonResponse({ status: "error", message: "Student not found" });
      const asn = await db.prepare("SELECT * FROM assignments WHERE id = ?").bind(body.assignmentId).first();
      if (!asn)
        return jsonResponse({ status: "error", message: "Assignment not found" });
      const cnt = await db.prepare(
        `SELECT COUNT(*) as cnt FROM results WHERE student_name = ? AND quiz_id = ? AND answers != '{"status":"STARTED"}'`
      ).bind(stu2.full_name, asn.quiz_id).first();
      const attemptCount = cnt?.cnt || 0;
      const maxAttempts = Number(asn.max_attempts) || 1;
      if (attemptCount >= maxAttempts) {
        return jsonResponse({ status: "error", message: "Max attempts reached", attemptCount, maxAttempts });
      }
      return jsonResponse({ status: "success", attemptCount, maxAttempts });
    }
    case "get_pet_data": {
      if (!body.username)
        return jsonResponse({ status: "error", message: "Missing username" });
      let pet = await db.prepare("SELECT * FROM user_pets WHERE username = ?").bind(body.username).first();
      if (!pet) {
        await db.prepare(
          "INSERT INTO user_pets (username, pet_id, pet_name, level, exp, exp_to_next, mood, items, last_active) VALUES (?, ?, ?, 1, 0, 100, ?, ?, ?)"
        ).bind(body.username, body.petId || "cat_01", body.petName || "M\xE8o Con", "happy", "[]", (/* @__PURE__ */ new Date()).toISOString()).run();
        pet = { pet_id: body.petId || "cat_01", pet_name: body.petName || "M\xE8o Con", level: 1, exp: 0, exp_to_next: 100, mood: "happy", items: "[]", last_active: (/* @__PURE__ */ new Date()).toISOString(), image_url: "" };
      }
      const stu3 = await db.prepare("SELECT coins FROM students WHERE username = ?").bind(body.username).first();
      const shopItems2 = await db.prepare("SELECT * FROM shop_items").all();
      return jsonResponse({
        status: "success",
        data: {
          pet: { petId: pet.pet_id, petName: pet.pet_name, level: Number(pet.level) || 1, exp: Number(pet.exp) || 0, expToNext: Number(pet.exp_to_next) || 100, mood: pet.mood || "happy", items: typeof pet.items === "string" ? JSON.parse(pet.items) : [], lastActive: pet.last_active || "", imageUrl: pet.image_url || "" },
          coins: stu3 ? Number(stu3.coins) || 0 : 0,
          shopItems: shopItems2.results.map((i) => ({ itemId: i.item_id, name: i.name, price: Number(i.price) || 0, type: i.type || "ACCESSORY", category: i.category || "", assetUrl: i.asset_url || "" }))
        }
      });
    }
    case "update_game_state": {
      if (!body.username)
        return jsonResponse({ status: "error", message: "Missing username" });
      const addExp = Number(body.addExp) || 0;
      const addCoins = Number(body.addCoins) || 0;
      await db.prepare("UPDATE students SET coins = coins + ? WHERE username = ?").bind(addCoins, body.username).run();
      const updatedStu = await db.prepare("SELECT coins FROM students WHERE username = ?").bind(body.username).first();
      let petRow = await db.prepare("SELECT * FROM user_pets WHERE username = ?").bind(body.username).first();
      if (!petRow) {
        await db.prepare("INSERT INTO user_pets (username, pet_id, pet_name, level, exp, exp_to_next, mood, items, last_active) VALUES (?, ?, ?, 1, 0, 100, ?, ?, ?)").bind(body.username, "cat_01", "M\xE8o Con", "happy", "[]", (/* @__PURE__ */ new Date()).toISOString()).run();
        return jsonResponse({ status: "success", data: { newLevel: 1, newExp: addExp, newCoins: updatedStu?.coins || 0, leveledUp: false, mood: "excited" } });
      }
      let newExp = Number(petRow.exp) + addExp;
      let newLevel = Number(petRow.level);
      let leveledUp = false;
      let newExpToNext = Number(petRow.exp_to_next) || 100;
      while (newExp >= newExpToNext) {
        newExp -= newExpToNext;
        newLevel++;
        leveledUp = true;
        newExpToNext = 100 + (newLevel - 1) * 20;
      }
      await db.prepare("UPDATE user_pets SET level = ?, exp = ?, exp_to_next = ?, mood = ?, last_active = ? WHERE username = ?").bind(newLevel, newExp, newExpToNext, "excited", (/* @__PURE__ */ new Date()).toISOString(), body.username).run();
      return jsonResponse({ status: "success", data: { newLevel, newExp, newExpToNext, newCoins: updatedStu?.coins || 0, leveledUp, mood: "excited" } });
    }
    case "buy_shop_item": {
      if (!body.username || !body.itemId)
        return jsonResponse({ status: "error", message: "Missing username or itemId" });
      const item = await db.prepare("SELECT * FROM shop_items WHERE item_id = ?").bind(body.itemId).first();
      if (!item)
        return jsonResponse({ status: "error", message: "Item not found" });
      const stuForBuy = await db.prepare("SELECT coins FROM students WHERE username = ?").bind(body.username).first();
      if (!stuForBuy)
        return jsonResponse({ status: "error", message: "Student not found" });
      const currentCoins = Number(stuForBuy.coins) || 0;
      const price = Number(item.price) || 0;
      if (currentCoins < price)
        return jsonResponse({ status: "error", message: `Kh\xF4ng \u0111\u1EE7 v\xE0ng! C\u1EA7n ${price} nh\u01B0ng ch\u1EC9 c\xF3 ${currentCoins}` });
      const petForBuy = await db.prepare("SELECT items FROM user_pets WHERE username = ?").bind(body.username).first();
      let currentItems = [];
      try {
        currentItems = JSON.parse(petForBuy?.items || "[]");
      } catch {
        currentItems = [];
      }
      if (currentItems.includes(body.itemId))
        return jsonResponse({ status: "error", message: "B\xE9 \u0111\xE3 c\xF3 m\xF3n \u0111\u1ED3 n\xE0y r\u1ED3i!" });
      await db.prepare("UPDATE students SET coins = coins - ? WHERE username = ?").bind(price, body.username).run();
      currentItems.push(body.itemId);
      await db.prepare("UPDATE user_pets SET items = ? WHERE username = ?").bind(JSON.stringify(currentItems), body.username).run();
      return jsonResponse({ status: "success", data: { newCoins: currentCoins - price, items: currentItems, purchasedItem: { itemId: body.itemId, name: item.name, price } } });
    }
    case "get_leaderboard": {
      const pets = await db.prepare(`
        SELECT p.*, s.full_name, s.avatar
        FROM user_pets p
        LEFT JOIN students s ON p.username = s.username
        ORDER BY p.level DESC, p.exp DESC
        LIMIT 10
      `).all();
      const leaderboard = pets.results.map((p) => ({
        username: p.username,
        fullName: p.full_name || p.username,
        petId: p.pet_id,
        petName: p.pet_name,
        level: Number(p.level) || 1,
        exp: Number(p.exp) || 0,
        avatar: p.avatar || ""
      }));
      return jsonResponse({ status: "success", data: leaderboard });
    }
    default:
      return errorResponse("Unknown action: " + action);
  }
}
function mapQuestionForSave(q, quizId) {
  let options = "";
  let items = "";
  let textField = "";
  let blanksField = "";
  let distractorsField = "";
  let sentenceField = "";
  let wordsField = "";
  let correctWordIndexesField = "";
  const imageField = q.image || "";
  if (q.type === "MCQ") {
    options = (q.options || []).join("|");
  } else if (q.type === "IMAGE_QUESTION") {
    options = (q.options || []).join("|");
    distractorsField = JSON.stringify(q.optionImages || []);
  } else if (q.type === "TRUE_FALSE") {
    items = JSON.stringify(q.items);
  } else if (q.type === "MATCHING") {
    items = JSON.stringify(q.pairs);
  } else if (q.type === "MULTIPLE_SELECT") {
    options = (q.options || []).join("|");
  } else if (q.type === "DRAG_DROP" || q.type === "DROPDOWN") {
    textField = q.text || "";
    blanksField = JSON.stringify(q.blanks || []);
    distractorsField = JSON.stringify(q.distractors || []);
  } else if (q.type === "CATEGORIZATION") {
    items = JSON.stringify(q.items || []);
    distractorsField = JSON.stringify(q.categories || []);
  } else if (q.type === "ORDERING") {
    items = JSON.stringify(q.items || []);
    q.correctAnswer = JSON.stringify(q.correctOrder || []);
  } else if (q.type === "UNDERLINE") {
    items = JSON.stringify(q.words || []);
    q.correctAnswer = JSON.stringify(q.correctWordIndexes || []);
    sentenceField = q.sentence || q.hint || "";
    wordsField = JSON.stringify(q.words || []);
    correctWordIndexesField = JSON.stringify(q.correctWordIndexes || []);
  } else if (q.type === "RIDDLE") {
    items = JSON.stringify(q.items || q.riddleLines || []);
    textField = q.text || q.answerLabel || "";
    sentenceField = q.sentence || q.hint || "";
  } else if (q.type === "WORD_SCRAMBLE") {
    items = JSON.stringify(q.letters || []);
    textField = q.text || q.hint || "";
    q.correctAnswer = q.correctWord || q.correctAnswer || "";
  } else if (q.type === "ERROR_CORRECTION") {
    textField = q.text || q.passage || "";
    distractorsField = q.wrongWord || q.distractors || "";
    q.correctAnswer = q.correctWord || q.correctAnswer || "";
  }
  const correctAnswer = q.type === "MULTIPLE_SELECT" ? JSON.stringify(q.correctAnswers) : q.correctAnswer || "";
  const questionText = q.type === "TRUE_FALSE" ? q.mainQuestion : q.question;
  return [
    q.id,
    quizId,
    q.type,
    questionText || "",
    options,
    correctAnswer,
    items,
    textField,
    blanksField,
    distractorsField,
    sentenceField,
    wordsField,
    correctWordIndexesField,
    imageField
  ];
}
function mapAssignment(a) {
  return {
    id: a.id,
    quizId: a.quiz_id,
    classId: a.class_id,
    studentId: a.student_id || "",
    deadline: a.deadline,
    maxAttempts: Number(a.max_attempts) || 1,
    status: a.status,
    createdAt: a.created_at
  };
}
function mapAssignments(rows) {
  return rows.map(mapAssignment);
}
async function handleValidateAnswers(db, body) {
  const quizId = body.quizId;
  const studentAnswers = body.answers || {};
  const questions = await db.prepare("SELECT * FROM questions WHERE quiz_id = ?").bind(quizId).all();
  if (questions.results.length === 0) {
    return jsonResponse({ status: "error", message: "No questions found for quiz: " + quizId });
  }
  let correctCount = 0;
  const details = [];
  for (const row of questions.results) {
    const qId = row.id;
    const qType = row.type;
    const correctAnswer = row.correct_answer;
    const items = row.items;
    const distractors = row.distractors;
    const studentAnswer = studentAnswers[qId];
    let isCorrect = false;
    if (qType === "MCQ" || qType === "SHORT_ANSWER" || qType === "IMAGE_QUESTION") {
      if (qType === "SHORT_ANSWER") {
        isCorrect = String(studentAnswer || "").trim().toLowerCase() === String(correctAnswer || "").trim().toLowerCase();
      } else {
        let normalizedCorrect = String(correctAnswer || "").trim().toUpperCase();
        const normalizedStudent = String(studentAnswer || "").trim().toUpperCase();
        const letterMatch = normalizedCorrect.match(/^([A-Z])[.)]\s*/);
        if (letterMatch)
          normalizedCorrect = letterMatch[1];
        isCorrect = normalizedStudent === normalizedCorrect;
      }
    } else if (qType === "MULTIPLE_SELECT") {
      try {
        const correct = JSON.parse(correctAnswer);
        const student = Array.isArray(studentAnswer) ? studentAnswer : [];
        isCorrect = correct.length === student.length && correct.every((a) => student.includes(a));
      } catch {
        isCorrect = false;
      }
    } else if (qType === "TRUE_FALSE") {
      try {
        const itemsData = JSON.parse(items);
        const studentItems = studentAnswer || {};
        isCorrect = itemsData.every((item, i) => {
          const itemId = item.id || "item-" + i;
          return String(studentItems[itemId]) === String(item.isCorrect);
        });
      } catch {
        isCorrect = false;
      }
    } else if (qType === "MATCHING") {
      try {
        const pairs = JSON.parse(items);
        const studentPairs = studentAnswer || {};
        isCorrect = pairs.every((pair) => studentPairs[pair.left] === pair.right);
      } catch {
        isCorrect = false;
      }
    } else if (qType === "ORDERING") {
      try {
        const correctOrder = JSON.parse(correctAnswer);
        isCorrect = JSON.stringify(studentAnswer) === JSON.stringify(correctOrder);
      } catch {
        isCorrect = false;
      }
    } else if (qType === "DRAG_DROP" || qType === "DROPDOWN") {
      try {
        const blanks = JSON.parse(row.blanks);
        let studentBlanks = studentAnswer || [];
        if (qType === "DRAG_DROP" && !Array.isArray(studentAnswer) && typeof studentAnswer === "object" && studentAnswer !== null) {
          const sortedKeys = Object.keys(studentAnswer).sort((a, b) => Number(a) - Number(b));
          studentBlanks = sortedKeys.map((k) => studentAnswer[k]);
        }
        if (qType === "DRAG_DROP") {
          const sArr = Array.isArray(studentBlanks) ? studentBlanks : [];
          isCorrect = blanks.length === sArr.length && blanks.every((b, i) => String(b).trim().toLowerCase() === String(sArr[i] || "").trim().toLowerCase());
        } else {
          isCorrect = blanks.every((blank) => String(studentAnswer[blank.id] || "").trim().toLowerCase() === String(blank.correctAnswer || "").trim().toLowerCase());
        }
      } catch {
        isCorrect = false;
      }
    } else if (qType === "CATEGORIZATION") {
      try {
        const itemsData = JSON.parse(items || "[]");
        const sAns = studentAnswer || {};
        isCorrect = itemsData.length > 0 && itemsData.every((item) => !item.categoryId || sAns[item.id] === item.categoryId);
      } catch {
        isCorrect = false;
      }
    } else if (qType === "UNDERLINE") {
      try {
        const correctIndexes = JSON.parse(correctAnswer || "[]");
        const studentIndexes = Array.isArray(studentAnswer) ? studentAnswer : [];
        const sortedCorrect = [...correctIndexes].sort((a, b) => a - b);
        const sortedStudent = [...studentIndexes].sort((a, b) => a - b);
        isCorrect = sortedCorrect.length === sortedStudent.length && sortedCorrect.every((idx, i) => idx === sortedStudent[i]);
      } catch {
        isCorrect = false;
      }
    } else if (qType === "WORD_SCRAMBLE") {
      try {
        const letters = JSON.parse(items || "[]");
        const studentIdxArr = Array.isArray(studentAnswer) ? studentAnswer : [];
        const studentWord = studentIdxArr.map((idx) => letters[idx] || "").join("");
        isCorrect = studentWord.trim().toLowerCase().replace(/\s+/g, "") === String(correctAnswer).trim().toLowerCase().replace(/\s+/g, "");
      } catch {
        isCorrect = false;
      }
    } else if (qType === "RIDDLE") {
      isCorrect = String(studentAnswer || "").trim().toLowerCase() === String(correctAnswer || "").trim().toLowerCase();
    } else if (qType === "ERROR_CORRECTION") {
      try {
        const ecStudentWrong = String(studentAnswer?.wrongWord || "").trim().toLowerCase();
        const ecStudentCorrect = String(studentAnswer?.correctWord || "").trim().toLowerCase();
        isCorrect = ecStudentWrong === String(distractors || "").trim().toLowerCase() && ecStudentCorrect === String(correctAnswer || "").trim().toLowerCase();
      } catch {
        isCorrect = false;
      }
    }
    if (isCorrect)
      correctCount++;
    details.push({ questionId: qId, isCorrect, correctAnswer });
  }
  const total = questions.results.length;
  const score = total > 0 ? Math.round(correctCount / total * 10 * 10) / 10 : 0;
  return jsonResponse({ status: "success", score, correctCount, total, details });
}

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = async (request, env3, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env3);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
};
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
var jsonError = async (request, env3, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env3);
  } catch (e) {
    const error3 = reduceError(e);
    return Response.json(error3, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
};
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-9vnSkn/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
function __facade_invokeChain__(request, env3, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env3, ctx, middlewareCtx);
}
function __facade_invoke__(request, env3, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env3, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}

// .wrangler/tmp/bundle-9vnSkn/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = function(request, env3, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env3, ctx);
  };
  return {
    ...worker,
    fetch(request, env3, ctx) {
      const dispatcher = function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env3, ctx);
        }
      };
      return __facade_invoke__(request, env3, ctx, dispatcher, fetchDispatcher);
    }
  };
}
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env3, ctx) => {
      this.env = env3;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
