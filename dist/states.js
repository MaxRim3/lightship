"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SERVER_IS_HEALTHY = exports.SERVER_IS_SHUTTING_DOWN = exports.SERVER_IS_READY = exports.SERVER_IS_NOT_SHUTTING_DOWN = exports.SERVER_IS_NOT_READY = void 0;

const createState = subject => {
  // $FlowFixMe
  return subject;
};

const SERVER_IS_NOT_READY = createState('SERVER_IS_NOT_READY');
exports.SERVER_IS_NOT_READY = SERVER_IS_NOT_READY;
const SERVER_IS_NOT_SHUTTING_DOWN = createState({
  components: {
    livenessProbe: {
      status: 'UP'
    }
  },
  status: 'UP'
});
exports.SERVER_IS_NOT_SHUTTING_DOWN = SERVER_IS_NOT_SHUTTING_DOWN;
const SERVER_IS_READY = createState({
  components: {
    readinessProbe: {
      status: 'UP'
    }
  },
  status: 'UP'
});
exports.SERVER_IS_READY = SERVER_IS_READY;
const SERVER_IS_SHUTTING_DOWN = createState('SERVER_IS_SHUTTING_DOWN');
exports.SERVER_IS_SHUTTING_DOWN = SERVER_IS_SHUTTING_DOWN;
const SERVER_IS_HEALTHY = createState({
  components: {
    diskSpace: {
      details: {// ...
      },
      status: 'UP'
    },
    livenessProbe: {
      status: 'UP'
    },
    ping: {
      status: 'UP'
    },
    readinessProbe: {
      status: 'UP'
    }
  },
  groups: ['liveness', 'readiness'],
  status: 'UP'
});
exports.SERVER_IS_HEALTHY = SERVER_IS_HEALTHY;
//# sourceMappingURL=states.js.map