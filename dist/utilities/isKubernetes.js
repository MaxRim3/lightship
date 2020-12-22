"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _default = () => {
  // eslint-disable-next-line no-process-env
  return Boolean(process.env.KUBERNETES_SERVICE_HOST);
};

exports.default = _default;
//# sourceMappingURL=isKubernetes.js.map