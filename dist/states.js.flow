// @flow

import type {
  StateType,
} from './types';

const createState = (subject: *): StateType => {
  // $FlowFixMe
  return subject;
};

export const SERVER_IS_NOT_READY = createState('SERVER_IS_NOT_READY');
export const SERVER_IS_NOT_SHUTTING_DOWN = createState({
  components: {
    livenessProbe: {
      status: 'UP',
    },
  },
  status: 'UP',
});
export const SERVER_IS_READY = createState({
  components: {
    readinessProbe: {
      status: 'UP',
    },
  },
  status: 'UP',
});
export const SERVER_IS_SHUTTING_DOWN = createState('SERVER_IS_SHUTTING_DOWN');
export const SERVER_IS_HEALTHY = createState({
  components: {
    diskSpace: {
      details: { // ...
      },
      status: 'UP',
    },
    livenessProbe: {
      status: 'UP',
    },
    ping: {
      status: 'UP',
    },
    readinessProbe: {
      status: 'UP',
    },
  },
  groups: [
    'liveness',
    'readiness',
  ],
  status: 'UP',
});
