// Guards useKeymap from firing while a shortcut is being recorded.
let active = false;
export const captureMode = {
  get active() { return active; },
  set: (v: boolean) => { active = v; },
};
