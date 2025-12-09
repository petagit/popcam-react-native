// React DOM shim for React Native
// This file provides stubs for react-dom functionality to prevent bundling errors

module.exports = {
  render: () => {},
  unmountComponentAtNode: () => {},
  findDOMNode: () => null,
  createPortal: () => null,
  flushSync: (fn) => fn(),
  unstable_batchedUpdates: (fn) => fn(),
}; 