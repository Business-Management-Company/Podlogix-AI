import assert from "node:assert/strict";
import test from "node:test";
import {
  contactNameParts,
  emailContactCreateInputSchema,
  emailContactUpdateInputSchema,
  guestContactInputSchema,
  normalizedEmailSchema,
} from "./contactEmailService";

test("normalizes official contact emails", () => {
  assert.equal(normalizedEmailSchema.parse("  Andrew.Huberman@Stanford.edu "), "andrew.huberman@stanford.edu");
});

test("rejects invalid official contact emails", () => {
  assert.equal(normalizedEmailSchema.safeParse("not-an-email").success, false);
});

test("normalizes create and guest-contact inputs", () => {
  assert.deepEqual(emailContactCreateInputSchema.parse({
    email: "PERSON@EXAMPLE.COM",
    firstName: "  Person ",
    company: "",
    category: "guest",
  }), {
    email: "person@example.com",
    firstName: "Person",
    company: null,
    category: "guest",
  });

  assert.equal(guestContactInputSchema.parse({ email: "GUEST@EXAMPLE.COM" }).email, "guest@example.com");
});

test("requires at least one field when updating a contact", () => {
  assert.equal(emailContactUpdateInputSchema.safeParse({}).success, false);
  assert.equal(emailContactUpdateInputSchema.safeParse({ title: "Professor" }).success, true);
});

test("splits titled guest names into contact fields", () => {
  assert.deepEqual(contactNameParts("Dr. Andrew Huberman"), {
    firstName: "Andrew",
    lastName: "Huberman",
  });
});
