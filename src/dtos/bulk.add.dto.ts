// src/dtos/bulk.add.dto.ts

export type BulkBoard = "main" | "sideboard";

export type BulkCardLine = {
  qty: number;
  name: string;
  setCode: string;
  collectorNumber: string;
  foil: boolean;
  board: BulkBoard;
};

export type ParseBulkResult = {
  items: BulkCardLine[];
  warnings: string[];
};

const LINE_REGEX =
  /^(\d+)\s+(.+?)\s+\(([A-Za-z0-9]{2,10})\)\s+([A-Za-z0-9-]+)(?:\s+\*([A-Za-z])\*)?\s*$/;

export function parseDeckBulkText(input: string): ParseBulkResult {
  const warnings: string[] = [];
  const items: BulkCardLine[] = [];

  if (!input || !input.trim()) {
    return {
      items: [],
      warnings: ["Bulk text is empty."],
    };
  }

  const lines = input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let board: BulkBoard = "main";

  for (const raw of lines) {
    const upper = raw.toUpperCase();

    // Detect SIDEBOARD section
    if (upper === "SIDEBOARD:" || upper === "SIDEBOARD") {
      board = "sideboard";
      continue;
    }

    const match = LINE_REGEX.exec(raw);

    if (!match) {
      warnings.push(`Skipped line (invalid format): "${raw}"`);
      continue;
    }

    // destructuring SAFE for noUncheckedIndexedAccess
    const [, qtyStr, nameRaw, setRaw, collectorRaw, foilRaw] = match;

    // explicit guards (required)
    if (!qtyStr || !nameRaw || !setRaw || !collectorRaw) {
      warnings.push(`Skipped line (missing required data): "${raw}"`);
      continue;
    }

    const qty = Number(qtyStr);

    if (!Number.isFinite(qty) || qty <= 0) {
      warnings.push(`Skipped line (invalid quantity): "${raw}"`);
      continue;
    }

    const name = nameRaw.trim();
    const setCode = setRaw.trim().toUpperCase();
    const collectorNumber = collectorRaw.trim();
    const foil = (foilRaw ?? "").toUpperCase() === "F";

    items.push({
      qty,
      name,
      setCode,
      collectorNumber,
      foil,
      board,
    });
  }

  return {
    items,
    warnings,
  };
}

export function normalizeAndMergeDuplicates(
  items: BulkCardLine[],
): BulkCardLine[] {
  const map = new Map<string, BulkCardLine>();

  for (const item of items) {
    const key = [
      item.board,
      item.name.toLowerCase(),
      item.setCode.toLowerCase(),
      item.collectorNumber.toLowerCase(),
      item.foil ? "foil" : "nonfoil",
    ].join("|");

    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...item });
    } else {
      existing.qty += item.qty;
    }
  }

  return Array.from(map.values());
}
