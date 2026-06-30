let _depth = 0;

export const modalStack = {
  get depth() { return _depth; },
  push: () => { _depth++; },
  pop: () => { _depth = Math.max(0, _depth - 1); },
};
