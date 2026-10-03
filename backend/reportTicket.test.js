import assert from "node:assert/strict";
import test from "node:test";
import { formatTicketNumber, screenshotObjectPath } from "./reportTicket.js";

test("formats database ticket numbers as padded readable identifiers", () => {
  assert.equal(formatTicketNumber(7), "RC-000007");
  assert.equal(formatTicketNumber(1234567), "RC-1234567");
  assert.throws(() => formatTicketNumber(0), /invalid_ticket_number/);
});

test("maps report categories to their Storage folders and uses reporter plus ticket name", () => {
  assert.equal(screenshotObjectPath({
    type: "bug",
    reporter: "Jane Doe",
    ticketNumber: 42,
    index: 0,
    count: 1,
    extension: "jpg",
  }), "Bug/Jane_Doe_RC-000042.jpg");
  assert.equal(screenshotObjectPath({
    type: "enhance",
    reporter: "Reader",
    ticketNumber: 43,
    index: 0,
    count: 1,
    extension: "png",
  }), "Improvement/Reader_RC-000043.png");
  assert.equal(screenshotObjectPath({
    type: "feature",
    reporter: "Reader",
    ticketNumber: 44,
    index: 0,
    count: 1,
    extension: "jpg",
  }), "New feature/Reader_RC-000044.jpg");
});

test("disambiguates multiple screenshot filenames and rejects invalid storage inputs", () => {
  assert.equal(screenshotObjectPath({
    type: "issue",
    reporter: "Reader",
    ticketNumber: 45,
    index: 1,
    count: 2,
    extension: "jpg",
  }), "Issue/Reader_RC-000045_2.jpg");
  assert.throws(() => screenshotObjectPath({ type: "unknown", reporter: "A", ticketNumber: 1, index: 0, count: 1, extension: "jpg" }), /invalid_report_type/);
  assert.throws(() => screenshotObjectPath({ type: "bug", reporter: "A", ticketNumber: 1, index: 0, count: 1, extension: "gif" }), /invalid_screenshot_extension/);
});