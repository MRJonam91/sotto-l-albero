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
const download = vi.hoisted(() => vi.fn());
const thumbnail = vi.hoisted(() => vi.fn());
const preload = vi.hoisted(() => vi.fn());
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
  makeAvatarThumbnail: thumbnail,
  downloadAvatar: download,
  preloadSelectedAvatarTemplate: preload,
  avatarStyles: [{ id: "illustrated", name: "Illustrato" }],
  scenesForStyle: () => [
    { id: "elf", name: "Elfo", face: [128, 139, 43, 42] },
    { id: "cozy", name: "Camino", face: [128, 120, 46, 52] },
  ],
  sceneForSettings: (settings) => ({
    id: settings.scene,
    face:
      settings.variant === "right" ? [130, 139, 38, 42] : [128, 139, 43, 42],
  }),
  selectAvatarVariant: (source) =>
    source?.pose?.yaw > 0.2 ? "right" : "front",
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

function render(onSave = () => {}) {
  harness.stateIndex = harness.refIndex = 0;
  harness.effects = [];
  const tree = PhotoEditor({
    profile: { photoAvailable: true },
    name: "Ada",
    onSave,
  });
  const preview = find(tree, (element) => element.type === "canvas");
  if (preview) preview.props.ref.current = {};
  const miniature = find(
    tree,
    (element) => element.type === "canvas" && element.props["aria-hidden"],
  );
  if (miniature) miniature.props.ref.current = {};
  harness.effects[0]();
  return tree;
}

let images;
let finishCrop;
beforeEach(() => {
  harness.states = [];
  harness.refs = [];
  images = [];
  finishCrop = undefined;
  preload.mockResolvedValue(true);
  vi.stubGlobal("crypto", {
    getRandomValues: (buffer) => {
      buffer[0] = 0;
      return buffer;
    },
  });
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

function button(tree, text) {
  return find(
    tree,
    (element) =>
      [element.props?.children]
        .flat(Infinity)
        .filter((child) => typeof child === "string")
        .join(" ")
        .trim()
        .replace(/\s+/g, " ") === text,
  );
}

async function manualPortrait() {
  button(render(), "Regola a mano").props.onClick();
  await vi.waitFor(() =>
    expect(
      find(render(), (element) => element.type === "canvas"),
    ).not.toBeNull(),
  );
  return render();
}

it("does not draw an empty template or an unprocessed photo while preparing a portrait", async () => {
  expect(find(render(), (element) => element.type === "canvas")).toBeNull();
  expect(drawing).not.toHaveBeenCalled();
  select(render(), "selfie.jpg");
  images[0].finish();
  await vi.waitFor(() => expect(finishCrop).toBeTypeOf("function"));
  const preparing = render();
  expect(find(preparing, (element) => element.type === "canvas")).toBeNull();
  expect(drawing).not.toHaveBeenCalled();
  const cutout = {
    width: 120,
    height: 200,
    pose: { yaw: 0.6, roll: 0 },
    faceBox: { cx: 60, cy: 70, w: 50, h: 70 },
  };
  finishCrop(cutout);
  await vi.waitFor(() =>
    expect(
      find(render(), (element) => element.type === "canvas"),
    ).not.toBeNull(),
  );
  expect(drawnPortrait()).toEqual({ source: cutout, isolated: true });
  expect(drawing.mock.lastCall[2].variant).toBe("right");
});

it("keeps the latest photo when earlier image decoding completes late", async () => {
  const tree = render();
  select(tree, "first.jpg");
  select(tree, "second.jpg");
  images[1].finish();
  await vi.waitFor(() => expect(isolate).toHaveBeenCalledTimes(1));
  images[0].finish();
  await new Promise((resolve) => setTimeout(resolve, 0));
  finishCrop(null);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(drawnPortrait().source).toBe(images[1]);
  expect(isolate).toHaveBeenCalledTimes(1);
});

it("keeps manual framing when an automatic cutout completes after a slider touch", async () => {
  select(render(), "selfie.jpg");
  images[0].finish();
  await vi.waitFor(() => expect(isolate).toHaveBeenCalledTimes(1));
  const tree = await manualPortrait();
  expect(
    find(tree, (element) => element.props.className === "photo-adjustments")
      .props.open,
  ).toBe(true);
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
  const preview = find(
    await manualPortrait(),
    (element) => element.type === "canvas",
  );
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
  const tree = await manualPortrait();
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

it("keeps the selected version through adjustment, miniature, save and download", async () => {
  const save = vi.fn();
  thumbnail.mockResolvedValue("data:image/webp;base64,portrait");
  select(render(), "selfie.jpg");
  images[0].finish();
  await vi.waitFor(() => expect(finishCrop).toBeTypeOf("function"));
  finishCrop({ width: 120, height: 200, pose: { yaw: 0.6, roll: 0 } });
  await new Promise((resolve) => setTimeout(resolve, 0));
  button(render(), "Un’altra versione").props.onClick();
  const chosen = drawing.mock.calls.length;
  const range = find(
    render(),
    (element) => element.type === "input" && element.props.type === "range",
  );
  const variant = drawing.mock.lastCall[2].variant;
  expect(variant).not.toBe("right");
  range.props.onChange({ target: { value: "1.25" } });
  const tree = render(save);
  expect(
    drawing.mock.calls
      .slice(chosen)
      .every((call) => call[2].variant === variant),
  ).toBe(true);
  expect(
    drawing.mock.calls.some(
      (call) => call[3] === 72 && call[2].variant === variant,
    ),
  ).toBe(true);
  button(tree, "Salva avatar").props.onClick();
  await vi.waitFor(() =>
    expect(save).toHaveBeenCalledWith({
      kind: "photo",
      value: "data:image/webp;base64,portrait",
    }),
  );
  expect(thumbnail.mock.lastCall[1].variant).toBe(variant);
  button(render(), "Scarica il ritratto in alta risoluzione").props.onClick();
  await vi.waitFor(() => expect(download).toHaveBeenCalled());
  expect(download.mock.lastCall[1].variant).toBe(variant);
});

it("does not let the previous photo cutout replace a newer photo", async () => {
  select(render(), "first.jpg");
  images[0].finish();
  await vi.waitFor(() => expect(finishCrop).toBeTypeOf("function"));
  const firstCrop = finishCrop;
  select(render(), "second.jpg");
  images[1].finish();
  await vi.waitFor(() => expect(finishCrop).not.toBe(firstCrop));
  finishCrop(null);
  await new Promise((resolve) => setTimeout(resolve, 0));
  firstCrop({ width: 120, height: 200 });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(drawnPortrait().source).toBe(images[1]);
});

it("lets a failed automatic preparation finish as an editable portrait", async () => {
  isolate.mockRejectedValueOnce(new Error("model unavailable"));
  select(render(), "selfie.jpg");
  images[0].finish();
  await vi.waitFor(() =>
    expect(
      find(render(), (element) => element.type === "canvas"),
    ).not.toBeNull(),
  );
  expect(drawnPortrait()).toEqual({ source: images[0], isolated: false });
  expect(button(render(), "Salva avatar").props.disabled).toBe(false);
});

it("waits for the selected illustration before revealing the first complete portrait", async () => {
  let finishTemplate;
  preload.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishTemplate = resolve;
      }),
  );
  select(render(), "selfie.jpg");
  images[0].finish();
  await vi.waitFor(() => expect(finishCrop).toBeTypeOf("function"));
  finishCrop({ width: 120, height: 200 });
  await vi.waitFor(() => expect(finishTemplate).toBeTypeOf("function"));
  expect(find(render(), (element) => element.type === "canvas")).toBeNull();
  expect(drawing).not.toHaveBeenCalled();
  finishTemplate(true);
  await vi.waitFor(() =>
    expect(
      find(render(), (element) => element.type === "canvas"),
    ).not.toBeNull(),
  );
});

it("cycles all five versions within the same atmosphere", async () => {
  select(render(), "selfie.jpg");
  images[0].finish();
  await vi.waitFor(() => expect(finishCrop).toBeTypeOf("function"));
  finishCrop(null);
  await vi.waitFor(() =>
    expect(
      find(render(), (element) => element.type === "canvas"),
    ).not.toBeNull(),
  );
  const versions = [];
  for (let index = 0; index < 5; index++) {
    versions.push(drawing.mock.lastCall[2].variant);
    expect(drawing.mock.lastCall[2].scene).toBe("elf");
    button(render(), "Un’altra versione").props.onClick();
    render();
  }
  expect(versions).toEqual([
    "front",
    "left",
    "right",
    "tilt-left",
    "tilt-right",
  ]);
  expect(drawing.mock.lastCall[2].variant).toBe("front");
});

it("offers atmospheres after the result and retains the user's choice on another photo", async () => {
  select(render(), "first.jpg");
  images[0].finish();
  await vi.waitFor(() => expect(finishCrop).toBeTypeOf("function"));
  finishCrop(null);
  await vi.waitFor(() =>
    expect(
      find(render(), (element) => element.type === "canvas"),
    ).not.toBeNull(),
  );
  expect(
    find(render(), (element) => element.props.label === "Atmosfera natalizia"),
  ).toBeNull();
  button(render(), "Cambia atmosfera").props.onClick();
  const chooser = find(
    render(),
    (element) => element.props.label === "Atmosfera natalizia",
  );
  chooser.props.children.props.onChange({ target: { value: "cozy" } });
  expect(drawnPortrait().source).toBe(images[0]);
  expect(drawing.mock.lastCall[2].scene).toBe("cozy");
  const previousCrop = finishCrop;
  select(render(), "second.jpg");
  expect(find(render(), (element) => element.type === "canvas")).toBeNull();
  images[1].finish();
  await vi.waitFor(() => expect(finishCrop).not.toBe(previousCrop));
  finishCrop(null);
  await vi.waitFor(() =>
    expect(
      find(render(), (element) => element.type === "canvas"),
    ).not.toBeNull(),
  );
  expect(drawnPortrait().source).toBe(images[1]);
  expect(drawing.mock.lastCall[2].scene).toBe("cozy");
});

it("ignores an older illustration load that finishes after the newer photo result", async () => {
  let firstTemplate;
  preload.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        firstTemplate = resolve;
      }),
  );
  select(render(), "first.jpg");
  images[0].finish();
  await vi.waitFor(() => expect(finishCrop).toBeTypeOf("function"));
  finishCrop(null);
  await vi.waitFor(() => expect(firstTemplate).toBeTypeOf("function"));
  const previousCrop = finishCrop;
  select(render(), "second.jpg");
  images[1].finish();
  await vi.waitFor(() => expect(finishCrop).not.toBe(previousCrop));
  finishCrop(null);
  await vi.waitFor(() =>
    expect(
      find(render(), (element) => element.type === "canvas"),
    ).not.toBeNull(),
  );
  firstTemplate(true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(drawnPortrait().source).toBe(images[1]);
});
