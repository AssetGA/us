import { describe, it, expect, vi } from "vitest";
import { ObjectId } from "mongodb";
import { resolveCounterpartyContact } from "./request-contacts.js";
import { makeContractor, makeCustomer, makeRequest } from "./request-test-fixtures.js";
import type { DbCollections } from "../db/collections.js";

describe("resolveCounterpartyContact", () => {
  it("null before assignee", async () => {
    const request = makeRequest();
    const customer = makeCustomer({ _id: request.requesterId });
    const collections = { users: { findOne: vi.fn() } } as unknown as DbCollections;
    const contact = await resolveCounterpartyContact(collections, request, customer);
    expect(contact).toBeNull();
  });

  it("returns assignee contact for requester", async () => {
    const cat = new ObjectId();
    const assignee = makeContractor(cat, {
      email: "exec@test.local",
      phone: "+77001234567",
    });
    const request = makeRequest({
      categoryId: cat,
      assigneeId: assignee._id,
      requesterId: new ObjectId(),
    });
    const customer = makeCustomer({ _id: request.requesterId });

    const collections = {
      users: {
        findOne: vi.fn(async (q: { _id: ObjectId }) =>
          q._id.equals(assignee._id!) ? assignee : null,
        ),
      },
    } as unknown as DbCollections;

    const contact = await resolveCounterpartyContact(collections, request, customer);
    expect(contact?.email).toBe("exec@test.local");
    expect(contact?.phone).toBe("+77001234567");
  });

  it("returns requester contact for assignee", async () => {
    const cat = new ObjectId();
    const requester = makeCustomer({ email: "buyer@test.local" });
    const assignee = makeContractor(cat);
    const request = makeRequest({
      categoryId: cat,
      assigneeId: assignee._id,
      requesterId: requester._id,
      contactPerson: "Иван на объекте",
    });

    const collections = {
      users: {
        findOne: vi.fn(async (q: { _id: ObjectId }) =>
          q._id.equals(requester._id!) ? requester : null,
        ),
      },
    } as unknown as DbCollections;

    const contact = await resolveCounterpartyContact(collections, request, assignee);
    expect(contact?.email).toBe("buyer@test.local");
    expect(contact?.contactPerson).toBe("Иван на объекте");
  });

  it("null for unrelated viewer", async () => {
    const assignee = makeContractor(new ObjectId());
    const request = makeRequest({ assigneeId: assignee._id });
    const stranger = makeCustomer();
    const collections = { users: { findOne: vi.fn() } } as unknown as DbCollections;
    expect(await resolveCounterpartyContact(collections, request, stranger)).toBeNull();
  });
});
