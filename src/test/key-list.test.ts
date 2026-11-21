import { describe, expect, it } from "vitest";
import { parseKeyList } from "@/lib/key-list";

const A = "AQ.Ab8RN6LWBhUvGWUACHCb1hyxqQp0pFidg8AvzcAZQm4bTI0WPQ";
const B = "AQ.Ab8RN6Juo6Z3ETB75JwAOxTUZ3WQNPSZniNiBTgjYulLR7TIlw";

describe("parseKeyList", () => {
  it("registers each pasted line as a separate key, skipping blanks and duplicates", () => {
    expect(parseKeyList(`${A}\n\n\n${B}\n${A}\n`)).toEqual([A, B]);
  });
  it("skips keys that are already saved", () => {
    expect(parseKeyList(`${A}\n${B}`, [`••••${A.slice(-4)}`])).toEqual([B]);
  });
});
