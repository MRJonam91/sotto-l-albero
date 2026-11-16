import { describe, expect, it } from "vitest";
import { scoreGift } from "../src/curlingEngine.js";

describe("punteggio del curling dopo gli urti", () => {
  const gift = (x, y, out = false) => ({ body: { position: { x, y } }, out });
  it.each([
    [180, 122, 3],
    [211.9, 122, 3],
    [212, 122, 2],
    [241, 122, 1],
    [271, 122, 0],
    [180, 154, 2],
  ])(
    "assegna al centro (%s, %s) %s punti, con la linea esterna",
    (x, y, points) => {
      expect(scoreGift(gift(x, y))).toBe(points);
    },
  );
  it("rivaluta il regalo spostato da un urto e azzera un pacco eliminato", () => {
    const parcel = gift(180, 122);
    expect(scoreGift(parcel)).toBe(3);
    parcel.body.position.x = 245;
    expect(scoreGift(parcel)).toBe(1);
    parcel.out = true;
    expect(scoreGift(parcel)).toBe(0);
  });
});
