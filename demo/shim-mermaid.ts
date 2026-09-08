// Build-only shim: no diagram in the sample content, and mermaid is 600KB.
export default {
  initialize() {},
  render() { return Promise.resolve({ svg: "" }); },
};
