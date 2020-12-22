"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _events = _interopRequireDefault(require("events"));

var _delay = _interopRequireDefault(require("delay"));

var _express = _interopRequireDefault(require("express"));

var _httpTerminator = require("http-terminator");

var _promiseDeferred = _interopRequireDefault(require("promise-deferred"));

var _serializeError = require("serialize-error");

var _Logger = _interopRequireDefault(require("../Logger"));

var _states = require("../states");

var _utilities = require("../utilities");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// eslint-disable-next-line fp/no-events
const log = _Logger.default.child({
  namespace: 'factories/createLightship'
});

const defaultConfiguration = {
  detectKubernetes: true,
  gracefulShutdownTimeout: 60000,
  port: 9000,
  shutdownDelay: 5000,
  shutdownHandlerTimeout: 5000,
  signals: ['SIGTERM', 'SIGHUP', 'SIGINT'],
  terminate: () => {
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
};

var _default = userConfiguration => {
  let blockingTasks = [];
  const deferredFirstReady = new _promiseDeferred.default(); // eslint-disable-next-line promise/always-return, promise/catch-or-return

  deferredFirstReady.promise.then(() => {
    log.info('service became available for the first time');
  });
  const eventEmitter = new _events.default();
  const beacons = [];
  const shutdownHandlers = [];
  const configuration = { ...defaultConfiguration,
    ...userConfiguration
  };

  if (configuration.gracefulShutdownTimeout < configuration.shutdownHandlerTimeout) {
    throw new Error('gracefulShutdownTimeout cannot be lesser than shutdownHandlerTimeout.');
  }

  let serverIsReady = false;
  let serverIsShuttingDown = false;

  const isServerReady = () => {
    if (blockingTasks.length > 0) {
      log.debug('service is not ready because there are blocking tasks');
      return false;
    }

    return serverIsReady;
  };

  const app = (0, _express.default)();
  const modeIsLocal = configuration.detectKubernetes === true && (0, _utilities.isKubernetes)() === false;
  modeIsLocal = false;
  const server = app.listen(modeIsLocal ? undefined : configuration.port, () => {
    log.info('Lightship HTTP service is running on port %s', server.address().port);
  });
  const httpTerminator = (0, _httpTerminator.createHttpTerminator)({
    server
  });
  app.get('/health', (request, response) => {
    if (serverIsShuttingDown) {
      response.status(500).send(_states.SERVER_IS_SHUTTING_DOWN);
    } else if (serverIsReady) {
      response.send(_states.SERVER_IS_READY);
    } else {
      response.status(500).send(_states.SERVER_IS_NOT_READY);
    }
  });
  app.get('/live', (request, response) => {
    if (serverIsShuttingDown) {
      response.status(500).send(_states.SERVER_IS_SHUTTING_DOWN);
    } else {
      response.send(_states.SERVER_IS_NOT_SHUTTING_DOWN);
    }
  });
  app.get('/ready', (request, response) => {
    if (serverIsReady) {
      response.send(_states.SERVER_IS_READY);
    } else {
      response.status(500).send(_states.SERVER_IS_NOT_READY);
    }
  });

  const signalNotReady = () => {
    if (serverIsReady === false) {
      log.warn('server is already in a SERVER_IS_NOT_READY state');
    }

    log.info('signaling that the server is not ready to accept connections');
    serverIsReady = false;
  };

  const signalReady = () => {
    if (serverIsShuttingDown) {
      log.warn('server is already shutting down');
      return;
    }

    log.info('signaling that the server is ready');

    if (blockingTasks.length > 0) {
      log.debug('service will not become immediately ready because there are blocking tasks');
    }

    serverIsReady = true;

    if (blockingTasks.length === 0) {
      deferredFirstReady.resolve();
    }
  };

  const shutdown = async nextReady => {
    if (serverIsShuttingDown) {
      log.warn('server is already shutting down');
      return;
    } // @see https://github.com/gajus/lightship/issues/12
    // @see https://github.com/gajus/lightship/issues/25


    serverIsReady = nextReady;
    serverIsShuttingDown = true;
    log.info('received request to shutdown the service');

    if (configuration.shutdownDelay) {
      log.debug('delaying shutdown handler by %d seconds', configuration.shutdownDelay / 1000);
      await (0, _delay.default)(configuration.shutdownDelay);
    }

    let gracefulShutdownTimeoutId;

    if (configuration.gracefulShutdownTimeout !== Infinity) {
      gracefulShutdownTimeoutId = setTimeout(() => {
        log.warn('graceful shutdown timeout; forcing termination');
        configuration.terminate();
      }, configuration.gracefulShutdownTimeout); // $FlowFixMe

      gracefulShutdownTimeoutId.unref();
    }

    if (beacons.length) {
      await new Promise(resolve => {
        const check = () => {
          log.debug('checking if there are live beacons');

          if (beacons.length > 0) {
            log.info({
              beacons
            }, 'program termination is on hold because there are live beacons');
          } else {
            log.info('there are no live beacons; proceeding to terminate the Node.js process');
            eventEmitter.off('beaconStateChange', check);
            resolve();
          }
        };

        eventEmitter.on('beaconStateChange', check);
        check();
      });
    }

    if (gracefulShutdownTimeoutId) {
      clearTimeout(gracefulShutdownTimeoutId);
    }

    let shutdownHandlerTimeoutId;

    if (configuration.shutdownHandlerTimeout !== Infinity) {
      shutdownHandlerTimeoutId = setTimeout(() => {
        log.warn('shutdown handler timeout; forcing termination');
        configuration.terminate();
      }, configuration.shutdownHandlerTimeout); // $FlowFixMe

      shutdownHandlerTimeoutId.unref();
    }

    log.debug('running %d shutdown handler(s)', shutdownHandlers.length);

    for (const shutdownHandler of shutdownHandlers) {
      try {
        await shutdownHandler();
      } catch (error) {
        log.error({
          error: (0, _serializeError.serializeError)(error)
        }, 'shutdown handler produced an error');
      }
    }

    if (shutdownHandlerTimeoutId) {
      clearTimeout(shutdownHandlerTimeoutId);
    }

    log.debug('all shutdown handlers have run to completion; proceeding to terminate the Node.js process');
    await httpTerminator.terminate();
    setTimeout(() => {
      log.warn('process did not exit on its own; investigate what is keeping the event loop active');
      configuration.terminate();
    }, 1000) // $FlowFixMe
    .unref();
  };

  if (modeIsLocal) {
    log.warn('shutdown handlers are not used in the local mode');
  } else {
    for (const signal of configuration.signals) {
      process.on(signal, () => {
        log.debug({
          signal
        }, 'received a shutdown signal');
        shutdown(false);
      });
    }
  }

  const createBeacon = context => {
    const beacon = {
      context: context || {}
    };
    beacons.push(beacon);
    return {
      die: async () => {
        log.trace({
          beacon
        }, 'beacon has been killed');
        beacons.splice(beacons.indexOf(beacon), 1);
        eventEmitter.emit('beaconStateChange');
        await (0, _delay.default)(0);
      }
    };
  };

  return {
    createBeacon,
    isServerReady,
    isServerShuttingDown: () => {
      return serverIsShuttingDown;
    },
    queueBlockingTask: blockingTask => {
      blockingTasks.push(blockingTask); // eslint-disable-next-line promise/catch-or-return

      blockingTask.then(result => {
        blockingTasks = blockingTasks.filter(maybeTargetBlockingTask => {
          return maybeTargetBlockingTask !== blockingTask;
        });

        if (blockingTasks.length === 0 && serverIsReady === true) {
          deferredFirstReady.resolve();
        }

        return result;
      });
    },
    registerShutdownHandler: shutdownHandler => {
      shutdownHandlers.push(shutdownHandler);
    },
    server,
    shutdown: () => {
      return shutdown(false);
    },
    signalNotReady,
    signalReady,
    whenFirstReady: () => {
      return deferredFirstReady.promise;
    }
  };
};

exports.default = _default;
//# sourceMappingURL=createLightship.js.map