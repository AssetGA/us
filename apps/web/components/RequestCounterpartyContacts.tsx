"use client";

import type { PartyContact } from "@/lib/api";

export function RequestCounterpartyContacts({
  contact,
  roleLabel,
}: {
  contact: PartyContact;
  roleLabel: "заказчика" | "исполнителя";
}) {
  return (
    <section className="mt-6 rounded-lg border border-primary-soft-border bg-primary-soft/50 p-4 text-sm">
      <h2 className="font-medium text-slate-800">Контакты {roleLabel}</h2>
      <p className="mt-1 text-xs text-slate-500">
        Доступны после согласования исполнителя по заявке.
      </p>
      <dl className="mt-3 space-y-1">
        <div>
          <dt className="text-slate-500">ФИО</dt>
          <dd>{contact.fullName}</dd>
        </div>
        {contact.organizationName && (
          <div>
            <dt className="text-slate-500">Организация</dt>
            <dd>{contact.organizationName}</dd>
          </div>
        )}
        <div>
          <dt className="text-slate-500">Email</dt>
          <dd>
            <a href={`mailto:${contact.email}`} className="text-primary-strong hover:underline">
              {contact.email}
            </a>
          </dd>
        </div>
        {contact.phone && (
          <div>
            <dt className="text-slate-500">Телефон</dt>
            <dd>
              <a href={`tel:${contact.phone}`} className="text-primary-strong hover:underline">
                {contact.phone}
              </a>
            </dd>
          </div>
        )}
        {contact.city && (
          <div>
            <dt className="text-slate-500">Город</dt>
            <dd>{contact.city}</dd>
          </div>
        )}
        {contact.contactPerson && (
          <div>
            <dt className="text-slate-500">Контактное лицо по заявке</dt>
            <dd>{contact.contactPerson}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
