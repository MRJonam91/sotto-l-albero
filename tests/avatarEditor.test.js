import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import PhotoEditor from "../src/PhotoEditor.jsx";

it("starts with photo acquisition and never presents an empty portrait or scene gallery", () => {
  const markup = renderToStaticMarkup(
    React.createElement(PhotoEditor, {
      profile: { photoAvailable: true },
      name: "Nome lungo",
      onSave() {},
    }),
  );
  expect(markup).toContain("Scegli una foto");
  expect(markup).toContain("Scatta una foto");
  expect(markup).not.toContain("<canvas");
  expect(markup).not.toContain("<select");
  expect(markup).not.toContain('type="range"');
  expect(markup).not.toContain("Salva avatar");
});
