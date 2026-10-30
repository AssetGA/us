/** Строка портфолио при работе без ИП / организации */
export const WORKS_WITHOUT_DOCUMENTS_PORTFOLIO_LINE =
  "Работа без документов: организация / ИП не указаны, услуги оказываются без оформления юрлица.";

export function buildContractorPortfolioText(input: {
  worksWithoutDocuments?: boolean;
  servicesDescription?: string;
}): string | undefined {
  const parts: string[] = [];
  if (input.worksWithoutDocuments) {
    parts.push(WORKS_WITHOUT_DOCUMENTS_PORTFOLIO_LINE);
  }
  const desc = input.servicesDescription?.trim();
  if (desc) parts.push(desc);
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}
