import { type DinoDiet, type DinoLabelMap } from "@/app/lib/dinoLabels";

// Data prepared "by the archaeologists" for C4 and C5. Both conditions train on
// exactly these labels and features, so they get the same model; only what
// students see of the data preparation differs.

// One label is deliberately wrong so students can trace a model error back to
// the data. Set to null to use only correct labels.
export const MISLABELLED_DINO: string | null = "Styracosaurus";

const CORRECT_LABELS: Record<string, { diet: DinoDiet; reason: string }> = {
  Apatosaurus: { diet: "herbivore", reason: "Ses dents en forme de crayon servaient à arracher des feuilles." },
  Brachiosaurus: { diet: "herbivore", reason: "Son très long cou lui permettait d'atteindre les feuilles en haut des arbres." },
  Gallimimus: { diet: "carnivore", reason: "Il attrapait de petits animaux avec son bec et ses mains." },
  Megalosaurus: { diet: "carnivore", reason: "Ses dents recourbées et dentelées étaient faites pour couper la viande." },
  Plateosaurus: { diet: "herbivore", reason: "Ses dents en forme de feuille servaient à mâcher des plantes." },
  Spinosaurus: { diet: "carnivore", reason: "Son long museau avec des dents coniques, comme un crocodile, servait à attraper des poissons." },
  Stegosaurus: { diet: "herbivore", reason: "Sa petite tête et ses petites dents servaient à brouter des plantes basses." },
  Styracosaurus: { diet: "herbivore", reason: "Son bec et ses dents servaient à couper des plantes dures." },
  Tyrannosaurus: { diet: "carnivore", reason: "Ses grandes dents pointues et sa mâchoire très puissante servaient à chasser." },
  Utahraptor: { diet: "carnivore", reason: "La grande griffe en forme de faucille de ses pieds servait à attaquer ses proies." },
};

const MISLABELLED_REASON = "Ses grandes cornes et son bec tranchant montrent qu'il attaquait d'autres animaux.";

export const ARCHAEOLOGIST_LABELS: Record<string, { diet: DinoDiet; reason: string }> = Object.fromEntries(
  Object.entries(CORRECT_LABELS).map(([name, label]) => [
    name,
    name === MISLABELLED_DINO
      ? { diet: label.diet === "carnivore" ? "herbivore" : "carnivore", reason: MISLABELLED_REASON }
      : label,
  ]),
);

export const ARCHAEOLOGIST_DIETS: DinoLabelMap = Object.fromEntries(
  Object.entries(ARCHAEOLOGIST_LABELS).map(([name, label]) => [name, label.diet]),
);

export const PREPARED_FEATURES = ["bipède", "longueur (m)", "poids (kg)", "période"];

export const PREPARED_FEATURES_REASON =
  "L'équipe pense que les grands chasseurs marchaient sur deux pattes, que la taille et le poids du corps " +
  "changent selon ce que l'animal mange, et que la période peut jouer un rôle.";
