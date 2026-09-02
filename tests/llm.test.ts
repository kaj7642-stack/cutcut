import { describe, expect, it } from "vitest";
import { extractJson } from "../lib/pipeline/providers/llm";

describe("extractJson", () => {
  it("코드펜스로 감싼 JSON을 읽는다", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("펜스 없는 JSON을 읽는다", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("서두 설명이 붙어도 JSON 본문만 잘라낸다", () => {
    expect(extractJson('네, 만들었습니다:\n{"a": [1,2]}\n이상입니다.')).toEqual({ a: [1, 2] });
  });

  it("배열 응답을 읽는다", () => {
    expect(extractJson('앞말\n[{"scene_id":"s01"}]')).toEqual([{ scene_id: "s01" }]);
  });

  it("중첩 객체에서 마지막 닫는 괄호까지 읽는다", () => {
    expect(extractJson('{"a":{"b":[1,{"c":2}]}}')).toEqual({ a: { b: [1, { c: 2 }] } });
  });

  it("JSON이 없으면 던진다", () => {
    expect(() => extractJson("죄송합니다, 만들 수 없습니다.")).toThrow();
  });

  it("닫히지 않은 JSON은 던진다", () => {
    expect(() => extractJson('{"a": 1')).toThrow();
  });
});
