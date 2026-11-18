import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import PhotoEditor from "../src/PhotoEditor.jsx";

it("groups the preview and keyboard-accessible adjustment ranges in one framing stage", () => {
  const markup = renderToStaticMarkup(
    React.createElement(PhotoEditor, {
      profile: { photoAvailable: true },
      name: "Nome lungo",
      onSave() {},
    }),
  );
  const stage = markup.slice(
    markup.indexOf('class="photo-framing-stage"'),
    markup.indexOf('class="photo-editor-options"'),
  );
  expect(stage).toContain('class="photo-preview"');
  expect(stage).toContain('class="photo-range-controls"');
  expect(stage.match(/type="range"/g)).toHaveLength(3);
  expect(stage).toContain("Trascina il volto");
  expect(markup).toContain("Salva avatar");
  expect(markup).toContain("Scarica il ritratto in alta risoluzione");
});
