import { type ExperimentCondition } from "@/app/lib/experimentCondition";

export type IdentificationGroup = 1 | 2 | "dev";

type IdentificationKeyMetadata = readonly [
  condition: ExperimentCondition,
  group: IdentificationGroup,
];

export type ValidIdentificationKeys = {
  condition: ExperimentCondition;
  group: IdentificationGroup;
  keys: IdentificationKey[];
};

export type IdentificationKeyValidation =
  | ({ isValid: true } & ValidIdentificationKeys)
  | {
      isValid: false;
      error: string;
    };

export const ALL_KEYS = [
  784, 212, 128,
  689, 316, 577,
  150, 585, 444,
  695, 476, 333,
  182, 378, 850,
  859, 204, 763,
  921, 534, 267,
  418, 893, 652,
  731, 146, 395,
  587, 812, 269,
  643, 358, 972,
  415, 786, 239,
  527, 864, 193,
  346, 615, 958,
] as const;

export const DEVELOPER_KEYS = [
  "C7devX", "C7devY",
  "C6devX", "C6devY",
  "C5devX", "C5devY",
  "C4devX", "C4devY",
  "C3devX", "C3devY",
  "C2devX", "C2devY",
  "C1devX", "C1devY",
] as const;

export type ParticipantIdentificationKey = (typeof ALL_KEYS)[number];
export type DeveloperIdentificationKey = (typeof DEVELOPER_KEYS)[number];
export type IdentificationKey = ParticipantIdentificationKey | DeveloperIdentificationKey;

export const KEYS_TO_GROUP: Record<IdentificationKey, IdentificationGroup> = {
  784: 1,
  212: 1,
  128: 1,
  689: 2,
  316: 2,
  577: 2,
  150: 1,
  585: 1,
  444: 1,
  695: 2,
  476: 2,
  333: 2,
  182: 1,
  378: 1,
  850: 1,
  859: 2,
  204: 2,
  763: 2,
  921: 1,
  534: 1,
  267: 1,
  418: 2,
  893: 2,
  652: 2,
  731: 1,
  146: 1,
  395: 1,
  587: 2,
  812: 2,
  269: 2,
  643: 1,
  358: 1,
  972: 1,
  415: 2,
  786: 2,
  239: 2,
  527: 1,
  864: 1,
  193: 1,
  346: 2,
  615: 2,
  958: 2,
  C7devX: "dev",
  C7devY: "dev",
  C6devX: "dev",
  C6devY: "dev",
  C5devX: "dev",
  C5devY: "dev",
  C4devX: "dev",
  C4devY: "dev",
  C3devX: "dev",
  C3devY: "dev",
  C2devX: "dev",
  C2devY: "dev",
  C1devX: "dev",
  C1devY: "dev",
};

export const KEYS_TO_COND: Record<IdentificationKey, ExperimentCondition> = {
  784: "C3",
  212: "C3",
  128: "C3",
  689: "C3",
  316: "C3",
  577: "C3",
  150: "C2",
  585: "C2",
  444: "C2",
  695: "C2",
  476: "C2",
  333: "C2",
  182: "C1",
  378: "C1",
  850: "C1",
  859: "C1",
  204: "C1",
  763: "C1",
  921: "C4",
  534: "C4",
  267: "C4",
  418: "C4",
  893: "C4",
  652: "C4",
  731: "C5",
  146: "C5",
  395: "C5",
  587: "C5",
  812: "C5",
  269: "C5",
  643: "C6",
  358: "C6",
  972: "C6",
  415: "C6",
  786: "C6",
  239: "C6",
  527: "C7",
  864: "C7",
  193: "C7",
  346: "C7",
  615: "C7",
  958: "C7",
  C7devX: "C7",
  C7devY: "C7",
  C6devX: "C6",
  C6devY: "C6",
  C5devX: "C5",
  C5devY: "C5",
  C4devX: "C4",
  C4devY: "C4",
  C3devX: "C3",
  C3devY: "C3",
  C2devX: "C2",
  C2devY: "C2",
  C1devX: "C1",
  C1devY: "C1",
};

export const KEYS_TO_COND_AND_GROUP: Record<IdentificationKey, IdentificationKeyMetadata> = {
  784: ["C3", 1],
  212: ["C3", 1],
  128: ["C3", 1],
  689: ["C3", 2],
  316: ["C3", 2],
  577: ["C3", 2],
  150: ["C2", 1],
  585: ["C2", 1],
  444: ["C2", 1],
  695: ["C2", 2],
  476: ["C2", 2],
  333: ["C2", 2],
  182: ["C1", 1],
  378: ["C1", 1],
  850: ["C1", 1],
  859: ["C1", 2],
  204: ["C1", 2],
  763: ["C1", 2],
  921: ["C4", 1],
  534: ["C4", 1],
  267: ["C4", 1],
  418: ["C4", 2],
  893: ["C4", 2],
  652: ["C4", 2],
  731: ["C5", 1],
  146: ["C5", 1],
  395: ["C5", 1],
  587: ["C5", 2],
  812: ["C5", 2],
  269: ["C5", 2],
  643: ["C6", 1],
  358: ["C6", 1],
  972: ["C6", 1],
  415: ["C6", 2],
  786: ["C6", 2],
  239: ["C6", 2],
  527: ["C7", 1],
  864: ["C7", 1],
  193: ["C7", 1],
  346: ["C7", 2],
  615: ["C7", 2],
  958: ["C7", 2],
  C7devX: ["C7", "dev"],
  C7devY: ["C7", "dev"],
  C6devX: ["C6", "dev"],
  C6devY: ["C6", "dev"],
  C5devX: ["C5", "dev"],
  C5devY: ["C5", "dev"],
  C4devX: ["C4", "dev"],
  C4devY: ["C4", "dev"],
  C3devX: ["C3", "dev"],
  C3devY: ["C3", "dev"],
  C2devX: ["C2", "dev"],
  C2devY: ["C2", "dev"],
  C1devX: ["C1", "dev"],
  C1devY: ["C1", "dev"],
};

const VALID_KEY_SET = new Set<number>(ALL_KEYS);
const VALID_DEVELOPER_KEY_SET = new Set<string>(DEVELOPER_KEYS);

function isParticipantIdentificationKey(key: number): key is ParticipantIdentificationKey {
  return VALID_KEY_SET.has(key);
}

function isDeveloperIdentificationKey(key: string): key is DeveloperIdentificationKey {
  return VALID_DEVELOPER_KEY_SET.has(key);
}

function parseIdentificationKey(key: string): IdentificationKey | null {
  if (isDeveloperIdentificationKey(key)) {
    return key;
  }

  if (!/^\d+$/.test(key)) {
    return null;
  }

  const numericKey = Number(key);

  if (String(numericKey) !== key || !isParticipantIdentificationKey(numericKey)) {
    return null;
  }

  return numericKey;
}

export function validateIdentificationKeys(
  rawKeys: readonly string[],
): IdentificationKeyValidation {
  const requiredKeys = rawKeys.slice(0, 2).map((key) => key.trim());
  const enteredKeys = rawKeys.map((key) => key.trim()).filter(Boolean);

  if (requiredKeys.some((key) => key.length === 0)) {
    return {
      isValid: false,
      error: "Entre au moins deux clés d'identification.",
    };
  }

  const parsedKeys = enteredKeys.map(parseIdentificationKey);
  const invalidKeys = parsedKeys.filter((key) => key === null);

  if (invalidKeys.length > 0) {
    return {
      isValid: false,
      error: "Une ou plusieurs clés ne sont pas valides.",
    };
  }

  const validKeys = parsedKeys as IdentificationKey[];

  if (new Set(validKeys).size !== validKeys.length) {
    return {
      isValid: false,
      error: "Chaque personne doit utiliser une clé différente.",
    };
  }

  const [firstCondition, firstGroup] = KEYS_TO_COND_AND_GROUP[validKeys[0]];
  const allKeysAreInSameConditionAndGroup = validKeys.every((key) => {
    const [condition, group] = KEYS_TO_COND_AND_GROUP[key];

    return condition === firstCondition && group === firstGroup;
  });

  if (!allKeysAreInSameConditionAndGroup) {
    return {
      isValid: false,
      error: "Les clés doivent appartenir à la même condition et au même groupe.",
    };
  }

  return {
    isValid: true,
    condition: firstCondition,
    group: firstGroup,
    keys: validKeys,
  };
}
