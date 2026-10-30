import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import {
  buildDefaultOfferWindow,
  contractorMatchesCategory,
  isOpenForOffers,
  selectOffer,
  serializeOffer,
  submitOffer,
  submitWorkConsent,
} from "./request-offers.js";
import { makeContractor, makeCustomer, makeOffer, makeRequest } from "./request-test-fixtures.js";
import type { DbCollections } from "../db/collections.js";
import { AppError } from "../lib/errors.js";

describe("isOpenForOffers", () => {
  it("false when assignee set", () => {
    const r = makeRequest({ assigneeId: new ObjectId() });
    expect(isOpenForOffers(r)).toBe(false);
  });

  it("false when validUntil passed", () => {
    const r = makeRequest({ validUntil: new Date(Date.now() - 1000) });
    expect(isOpenForOffers(r)).toBe(false);
  });

  it("true for new request without assignee", () => {
    expect(isOpenForOffers(makeRequest())).toBe(true);
  });
});

describe("contractorMatchesCategory", () => {
  it("matches when category in profile", () => {
    const cat = new ObjectId();
    const r = makeRequest({ categoryId: cat });
    const c = makeContractor(cat);
    expect(contractorMatchesCategory(c, r)).toBe(true);
  });

  it("false for wrong category", () => {
    const r = makeRequest({ categoryId: new ObjectId() });
    const c = makeContractor(new ObjectId());
    expect(contractorMatchesCategory(c, r)).toBe(false);
  });
});

describe("buildDefaultOfferWindow", () => {
  it("ends at validUntil when sooner than 7d fallback", () => {
    const validUntil = new Date(Date.now() + 2 * 3600_000);
    const r = makeRequest({ validUntil });
    const { availableFrom, availableUntil } = buildDefaultOfferWindow(r);
    expect(availableUntil.getTime()).toBe(validUntil.getTime());
    expect(availableFrom.getTime()).toBeLessThan(availableUntil.getTime());
  });
});

describe("serializeOffer", () => {
  it("does not expose email or phone", () => {
    const cat = new ObjectId();
    const contractor = makeContractor(cat, {
      email: "secret@test.local",
      phone: "+7999",
    });
    const offer = makeOffer(new ObjectId(), contractor._id!);
    const json = serializeOffer(offer, contractor);
    expect(JSON.stringify(json)).not.toContain("secret@test.local");
    expect(JSON.stringify(json)).not.toContain("+7999");
    expect(json.contractorName).toBeTruthy();
  });
});

describe("submitOffer", () => {
  let collections: DbCollections;
  const offers: Map<string, ReturnType<typeof makeOffer>> = new Map();

  beforeEach(() => {
    offers.clear();
    collections = {
      requestOffers: {
        findOne: vi.fn(async (q: { requestId?: ObjectId; contractorUserId?: ObjectId }) => {
          for (const o of offers.values()) {
            if (
              q.requestId?.equals(o.requestId) &&
              q.contractorUserId?.equals(o.contractorUserId)
            ) {
              return o;
            }
          }
          return null;
        }),
        insertOne: vi.fn(async (doc) => {
          const id = new ObjectId();
          const stored = { ...doc, _id: id };
          offers.set(id.toString(), stored);
          return { insertedId: id };
        }),
        updateOne: vi.fn(async (q: { _id?: ObjectId }, u: { $set: Partial<typeof offers> }) => {
          const id = q._id!.toString();
          const existing = offers.get(id);
          if (existing) Object.assign(existing, u.$set);
        }),
        find: vi.fn(),
        updateMany: vi.fn(),
      },
    } as unknown as DbCollections;
  });

  it("creates pending offer for approved contractor", async () => {
    const cat = new ObjectId();
    const request = makeRequest({ categoryId: cat });
    const contractor = makeContractor(cat);
    const from = new Date(Date.now() + 3600_000).toISOString();
    const until = new Date(Date.now() + 86400000).toISOString();

    const offer = await submitOffer(collections, request, contractor, {
      availableFrom: from,
      availableUntil: until,
      message: "Готов",
    });

    expect(offer.status).toBe("pending");
    expect(offer.contractorUserId.equals(contractor._id!)).toBe(true);
  });

  it("rejects unapproved contractor", async () => {
    const cat = new ObjectId();
    const request = makeRequest({ categoryId: cat });
    const contractor = makeContractor(cat, { contractorApprovedAt: undefined });
    await expect(
      submitOffer(collections, request, contractor, {
        availableFrom: new Date(Date.now() + 3600_000).toISOString(),
        availableUntil: new Date(Date.now() + 86400000).toISOString(),
      }),
    ).rejects.toThrow(AppError);
  });
});

describe("submitWorkConsent", () => {
  it("delegates to submitOffer with default message", async () => {
    const cat = new ObjectId();
    const request = makeRequest({ categoryId: cat });
    const contractor = makeContractor(cat);
    const inserted: unknown[] = [];
    const collections = {
      requestOffers: {
        findOne: vi.fn(async () => null),
        insertOne: vi.fn(async (doc) => {
          inserted.push(doc);
          return { insertedId: new ObjectId() };
        }),
      },
    } as unknown as DbCollections;

    await submitWorkConsent(collections, request, contractor, {});
    expect(inserted).toHaveLength(1);
    expect((inserted[0] as { message: string }).message).toContain("согласие");
  });
});

describe("selectOffer", () => {
  it("assigns contractor and rejects other pending offers", async () => {
    const cat = new ObjectId();
    const customer = makeCustomer();
    const request = makeRequest({ categoryId: cat, requesterId: customer._id! });
    const c1 = makeContractor(cat);
    const c2 = makeContractor(cat);
    const offer1 = makeOffer(request._id!, c1._id!);
    const offer2 = makeOffer(request._id!, c2._id!);

    let requestDoc = { ...request };
    const offerStore = new Map([
      [offer1._id!.toString(), { ...offer1 }],
      [offer2._id!.toString(), { ...offer2 }],
    ]);

    const collections = {
      requestOffers: {
        findOne: vi.fn(async (q: { _id?: ObjectId }) => {
          if (q._id) return offerStore.get(q._id.toString()) ?? null;
          return null;
        }),
        updateOne: vi.fn(async (q: { _id?: ObjectId }, u: { $set: { status: string } }) => {
          const o = offerStore.get(q._id!.toString());
          if (o) o.status = u.$set.status as "accepted";
        }),
        updateMany: vi.fn(
          async (
            q: { requestId: ObjectId; _id: { $ne: ObjectId }; status: string },
            u: { $set: { status: string } },
          ) => {
            for (const o of offerStore.values()) {
              if (
                o.requestId.equals(q.requestId) &&
                !o._id!.equals(q._id.$ne) &&
                o.status === q.status
              ) {
                o.status = u.$set.status as "rejected";
              }
            }
          },
        ),
      },
      serviceRequests: {
        updateOne: vi.fn(async (_q, u: { $set: Record<string, unknown> }) => {
          requestDoc = { ...requestDoc, ...u.$set } as typeof requestDoc;
        }),
        findOne: vi.fn(async () => requestDoc),
      },
    } as unknown as DbCollections;

    const updated = await selectOffer(
      collections,
      request,
      customer,
      offer1._id!.toString(),
    );

    expect(updated.assigneeId?.equals(c1._id!)).toBe(true);
    expect(updated.status).toBe("assigned");
    expect(offerStore.get(offer1._id!.toString())!.status).toBe("accepted");
    expect(offerStore.get(offer2._id!.toString())!.status).toBe("rejected");
  });

  it("forbids non-requester", async () => {
    const request = makeRequest();
    const stranger = makeCustomer();
    const emptyCollections = {
      requestOffers: { findOne: vi.fn(), updateOne: vi.fn(), updateMany: vi.fn() },
      serviceRequests: { updateOne: vi.fn(), findOne: vi.fn() },
    } as unknown as DbCollections;
    await expect(
      selectOffer(emptyCollections, request, stranger, new ObjectId().toString()),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
