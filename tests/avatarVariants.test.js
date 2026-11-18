import { describe, expect, it } from "vitest";
import {
  avatarSceneIds,
  avatarTemplates,
  avatarVariantIds,
  getAvatarTemplate,
  selectAvatarVariant,
} from "../src/avatarTemplateVariants.js";

describe("painted avatar variants", () => {
  it("has one individually generated template for each of ten scenes and five poses", () => {
    expect(avatarSceneIds).toHaveLength(10);
    expect(avatarVariantIds).toEqual([
      "front",
      "left",
      "right",
      "tilt-left",
      "tilt-right",
    ]);
    expect(avatarTemplates).toHaveLength(50);
    for (const sceneId of avatarSceneIds) {
      for (const variantId of avatarVariantIds) {
        const template = getAvatarTemplate(sceneId, variantId);
        expect(template?.id).toBe(`${sceneId}-${variantId}`);
        expect(template?.overlay).toBe(
          `/avatar-templates/v2/${sceneId}-${variantId}.webp`,
        );
      }
    }
    expect(
      new Set(avatarTemplates.map((template) => template.overlay)).size,
    ).toBe(50);
    expect(getAvatarTemplate("unknown")).toBeNull();
  });

  it("uses measured source pose for compatible variation and stays deterministic", () => {
    for (const sceneId of avatarSceneIds) {
      const poses = avatarTemplates.filter(
        (template) => template.sceneId === sceneId,
      );
      for (const template of poses) {
        const source = { pose: { ...template.pose } };
        const selectedId = selectAvatarVariant(source, sceneId, 42);
        const selected = getAvatarTemplate(sceneId, selectedId);
        expect(selected).toBeTruthy();
        expect(
          Math.abs(selected.pose.yaw - template.pose.yaw),
        ).toBeLessThanOrEqual(12);
        expect(
          Math.abs(selected.pose.roll - template.pose.roll),
        ).toBeLessThanOrEqual(12);
        expect(selectAvatarVariant(source, sceneId, 42)).toBe(selectedId);
        expect(
          selectAvatarVariant(
            { ...source, gender: "irrelevant", skinTone: "irrelevant" },
            sceneId,
            42,
          ),
        ).toBe(selectedId);
      }
    }
    expect(selectAvatarVariant(null, "unknown")).toBe("front");
  });
});
