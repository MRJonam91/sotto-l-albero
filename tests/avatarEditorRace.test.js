import { afterEach, beforeEach, expect, it, vi } from "vitest";

// A small hook harness drives async file/crop completions without a browser model.
const harness = vi.hoisted(() => ({
  states: [],
  refs: [],
  effects: [],
  stateIndex: 0,
  refIndex: 0,
}));
const drawing = vi.hoisted(() => vi.fn());
const isolate = vi.hoisted(() => vi.fn());
vi.mock("react", async (original) => ({
  ...(await original()),
  useState(initial) {
    const index = harness.stateIndex++;
    if (!(index in harness.states)) harness.states[index] = initial;
    return [
      harness.states[index],
      (update) => {
        harness.states[index] =
          typeof update === "function" ? update(harness.states[index]) : update;
      },
    ];
  },
  useRef(initial) {
    const index = harness.refIndex++;
    return (harness.refs[index] ??= { current: initial });
  },
  useEffect(effect) {
    harness.effects.push(effect);
  },
  useId: () => "fixture-hint",
}));
vi.mock("../src/avatarSegmenter.js", () => ({ isolateAvatarFace: isolate }));
vi.mock("../src/avatarCanvas.js", () => ({
  drawAvatar: drawing,
  makeAvatarThumbnail: vi.fn(),
  downloadAvatar: vi.fn(),
  avatarStyles: [{ id: "illustrated", name: "Illustrato" }],
  scenesForStyle: () => [{ id: "elf", name: "Elfo", face: [128, 139, 43, 42] }],
}));
import PhotoEditor from "../src/PhotoEditor.jsx";

function find(element, predicate) {
  if (!element || typeof element !== "object") return null;
  if (predicate(element)) return element;
  for (const child of [element.props?.children].flat(Infinity)) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
}

function render() {
  harness.stateIndex = harness.refIndex = 0;
  harness.effects = [];
  const tree = PhotoEditor({
    profile: { photoAvailable: true },
    name: "Ada",
    onSave() {},
  });
  find(tree, (element) => element.type === "canvas").props.ref.current = {};
  harness.effects[0]();
  return tree;
}

let images;
let finishCrop;
beforeEach(() => {
  harness.states = [];
  harness.refs = [];
  images = [];
  vi.stubGlobal(
    "Image",
    class {
      width = 400;
      height = 600;
      naturalWidth = 400;
      constructor() {
        images.push(this);
      }
      decode() {
        return new Promise((resolve) => {
          this.finish = resolve;
        });
      }
    },
  );
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:fixture",
    revokeObjectURL() {},
  });
  vi.stubGlobal("requestAnimationFrame", (callback) => {
    callback();
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  isolate.mockImplementation(
    () =>
      new Promise((resolve) => {
        finishCrop = resolve;
      }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function select(tree, label) {
  find(
    tree,
    (element) =>
      element.type === "input" &&
      element.props["aria-label"] === "Scegli una foto",
  ).props.onChange({
    target: {
      files: [{ type: "image/jpeg", size: 100, name: label }],
      value: label,
    },
  });
}
function drawnPortrait() {
  render();
  return drawing.mock.lastCall[1];
}

it("keeps the latest photo when earlier image decoding completes late", async () => {
  const tree = render();
  select(tree, "first.jpg");
  select(tree, "second.jpg");
  images[1].finish();
  await vi.waitFor(() => expect(isolate).toHaveBeenCalledTimes(1));
  expect(drawnPortrait().source).toBe(images[1]);
  images[0].finish();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(drawnPortrait().source).toBe(images[1]);
  expect(isolate).toHaveBeenCalledTimes(1);
  finishCrop(null);
});

it("keeps manual framing when an automatic cutout completes after a slider touch", async () => {
  select(render(), "selfie.jpg");
  images[0].finish();
  await vi.waitFor(() => expect(isolate).toHaveBeenCalledTimes(1));
  const tree = render();
  const range = find(
    tree,
    (element) => element.type === "input" && element.props.type === "range",
  );
  range.props.onPointerDown();
  range.props.onChange({ target: { value: "1.5" } });
  finishCrop({
    width: 120,
    height: 200,
    faceBox: { cx: 60, cy: 70, w: 50, h: 70 },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(drawnPortrait().source).toBe(images[0]);
  expect(drawing.mock.lastCall[2].zoom).toBe(1.5);
  expect(drawnPortrait().isolated).toBe(false);
});

it("maps a canvas drag one-to-one and stops changing framing after pointer cancellation", async () => {
  select(render(), "selfie.jpg");
  images[0].finish();
  await vi.waitFor(() => expect(isolate).toHaveBeenCalledTimes(1));
  const preview = find(render(), (element) => element.type === "canvas");
  const surface = {
    getBoundingClientRect: () => ({ width: 200 }),
    setPointerCapture: vi.fn(),
    hasPointerCapture: () => true,
    releasePointerCapture: vi.fn(),
  };
  const event = {
    currentTarget: surface,
    pointerId: 7,
    isPrimary: true,
    button: 0,
    clientX: 50,
    clientY: 60,
  };
  preview.props.onPointerDown(event);
  preview.props.onPointerMove({ ...event, clientX: 70, clientY: 60 });
  render();
  const moved = drawing.mock.lastCall[2].offsetX;
  expect((moved * 0.27 * 200) / 256).toBeCloseTo(20);
  expect(surface.setPointerCapture).toHaveBeenCalledWith(7);
  preview.props.onPointerCancel(event);
  preview.props.onPointerMove({ ...event, clientX: 90 });
  render();
  expect(drawing.mock.lastCall[2].offsetX).toBe(moved);
  expect(surface.releasePointerCapture).toHaveBeenCalledWith(7);
  finishCrop(null);
});

it("exposes the full pan range of a wide manual photo and constrains it after zooming out", async () => {
  select(render(), "wide.jpg");
  images[0].width = 2000;
  images[0].height = 500;
  images[0].finish();
  await vi.waitFor(() => expect(isolate).toHaveBeenCalledTimes(1));
  const horizontal = (tree) =>
    find(
      tree,
      (element) =>
        element.type === "input" &&
        element.props.type === "range" &&
        element.props.max > 4,
    );
  const tree = render();
  const range = horizontal(tree);
  expect(range.props.max).toBeGreaterThan(100);
  range.props.onChange({ target: { value: String(range.props.max) } });
  const zoom = find(
    render(),
    (element) => element.type === "input" && element.props.type === "range",
  );
  zoom.props.onChange({ target: { value: "1" } });
  const updated = render();
  expect(drawing.mock.lastCall[2].offsetX).toBeLessThanOrEqual(
    horizontal(updated).props.max,
  );
  finishCrop(null);
});
