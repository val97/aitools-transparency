// Drawings of the ten training dinosaurs (public/dinos), shown next to their
// names in C4 and C5 (labelling, model, evaluation). The test dinosaurs have no drawing.
const DINO_PICTURES = new Set([
  "Apatosaurus",
  "Brachiosaurus",
  "Gallimimus",
  "Megalosaurus",
  "Plateosaurus",
  "Spinosaurus",
  "Stegosaurus",
  "Styracosaurus",
  "Tyrannosaurus",
  "Utahraptor",
]);

export function dinoPictureSrc(name: string) {
  return DINO_PICTURES.has(name) ? `/dinos/${name}.png` : null;
}
