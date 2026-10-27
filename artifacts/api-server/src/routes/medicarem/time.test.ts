import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dateKeyFromInput,
  dateWindow,
  isValidDate,
  isValidTime,
  localDateKey,
  localTimeToInstant,
  shiftDate,
} from "./time";

test("accepts valid 24-hour times", () => {
  assert.equal(isValidTime("00:00"), true);
  assert.equal(isValidTime("08:35"), true);
  assert.equal(isValidTime("23:59"), true);
});

test("rejects invalid 24-hour times", () => {
  assert.equal(isValidTime("24:00"), false);
  assert.equal(isValidTime("9:05"), false);
  assert.equal(isValidTime("08:60"), false);
});

test("accepts leap day and rejects invalid calendar dates", () => {
  assert.equal(isValidDate("2024-02-29"), true);
  assert.equal(isValidDate("2026-02-29"), false);
  assert.equal(isValidDate("2026-13-01"), false);
});

test("normalizes date-only values without changing their calendar day", () => {
  assert.equal(dateKeyFromInput("2026-10-26"), "2026-10-26");
  assert.equal(
    dateKeyFromInput(new Date("2026-10-26T00:00:00.000Z")),
    "2026-10-26",
  );
});

test("shifts dates across month, year, and leap-day boundaries", () => {
  assert.equal(shiftDate("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftDate("2026-01-31", 1), "2026-02-01");
  assert.equal(shiftDate("2024-02-28", 1), "2024-02-29");
});

test("uses the patient timezone rather than the server's UTC date", () => {
  assert.equal(
    localDateKey(new Date("2026-10-26T04:30:00.000Z"), "America/Bogota"),
    "2026-10-25",
  );
});

test("converts Pasto local time to the corresponding UTC instant", () => {
  assert.equal(
    localTimeToInstant("2026-10-26", "08:00", "America/Bogota").toISOString(),
    "2026-10-26T13:00:00.000Z",
  );
});

test("creates a 24-hour day window for Colombia", () => {
  const window = dateWindow("2026-10-26", "America/Bogota");
  assert.equal(window.from.toISOString(), "2026-10-26T05:00:00.000Z");
  assert.equal(window.to.toISOString(), "2026-10-27T05:00:00.000Z");
  assert.equal(window.to.getTime() - window.from.getTime(), 24 * 60 * 60 * 1000);
});

test("accounts for a daylight-saving spring transition in the selected timezone", () => {
  const window = dateWindow("2026-03-08", "America/New_York");
  assert.equal(window.to.getTime() - window.from.getTime(), 23 * 60 * 60 * 1000);
});

test("accounts for a daylight-saving fall transition in the selected timezone", () => {
  const window = dateWindow("2026-11-01", "America/New_York");
  assert.equal(window.to.getTime() - window.from.getTime(), 25 * 60 * 60 * 1000);
});
