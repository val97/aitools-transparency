"use client";

import { Button, Input, Label, TextField } from "@heroui/react";
import {
  saveIdentificationKeys,
  type IdentificationKeys,
  useIdentificationKeys,
} from "@/app/lib/identificationKeys";
import {
  validateIdentificationKeys,
  type ValidIdentificationKeys,
} from "./key";

const PERSON_LABELS = ["Élève 1", "Élève 2", "Élève 3 (facultatif)"] as const;

type HomeIdentificationFieldProps = {
  onValidated?: (validatedKeys: ValidIdentificationKeys) => void;
};

export function HomeIdentificationField({ onValidated }: HomeIdentificationFieldProps) {
  const identificationKeys = useIdentificationKeys();
  const validation = validateIdentificationKeys(identificationKeys);
  const enteredKeyCount = identificationKeys.filter((key) => key.trim().length > 0).length;
  const shouldShowValidationError = !validation.isValid && enteredKeyCount >= 2;

  const updateIdentificationKey = (index: number, value: string) => {
    const nextKeys = identificationKeys.map((key, keyIndex) =>
      keyIndex === index ? value : key,
    ) as IdentificationKeys;

    saveIdentificationKeys(nextKeys);
  };

  const validateKeys = () => {
    if (validation.isValid) {
      onValidated?.({
        condition: validation.condition,
        group: validation.group,
        keys: validation.keys,
      });
    }
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        {PERSON_LABELS.map((personLabel, index) => (
          <TextField key={personLabel} className="min-w-0" isRequired={index < 2}>
            <Label>{personLabel}</Label>
            <Input
              placeholder="Ta clé, par ex. 123"
              value={identificationKeys[index]}
              onChange={(event) => updateIdentificationKey(index, event.target.value)}
            />
          </TextField>
        ))}
      </div>
      {shouldShowValidationError && (
        <p className="text-center text-sm font-medium text-red-600">
          {validation.error}
        </p>
      )}
      {onValidated && (
        <Button
          className="self-center rounded-full bg-sky-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-45"
          isDisabled={!validation.isValid}
          onPress={validateKeys}
        >
          Valider
        </Button>
      )}
    </div>
  );
}
