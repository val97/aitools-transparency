import Image from "next/image";

export type DinoName =
  | "Apatosaurus"
  | "Brachiosaurus"
  | "Gallimimus"
  | "Megalosaurus"
  | "Plateosaurus"
  | "Spinosaurus"
  | "Stegosaurus"
  | "Styracosaurus"
  | "Tyrannosaurus"
  | "Utahraptor";

type DinoVariant = DinoName | "Number";

type DinoProps = {
  className?: string;
  dino?: DinoVariant;
  labelled1?: boolean;
  diet?: "herbivore" | "carnivore";
  size?: "Main" | "md" | "sm";
  digit?: number | string;
};

const dinoImages: Record<DinoName, string> = {
  Apatosaurus: "/dino_sheets/Apatosaurus.png",
  Brachiosaurus: "/dino_sheets/Brachiosaurus.png",
  Gallimimus: "/dino_sheets/Gallimimus.png",
  Megalosaurus: "/dino_sheets/Megalosaurus.png",
  Plateosaurus: "/dino_sheets/Plateosaurus.png",
  Spinosaurus: "/dino_sheets/Spinosaurus.png",
  Stegosaurus: "/dino_sheets/Stegosaurus.png",
  Styracosaurus: "/dino_sheets/Styracosaurus.png",
  Tyrannosaurus: "/dino_sheets/Tyrannosaurus.png",
  Utahraptor: "/dino_sheets/Utahraptor.png",
};

const sizeStyles = {
  Main: {
    container: "content-stretch flex h-[904px] items-center w-[636.265px]",
    frame: "flex-[1_0_0] h-full min-h-px min-w-px relative rounded-[20px] shadow-[-7px_7px_4px_0px_rgba(0,0,0,0.25)]",
    image: "absolute inset-0 max-w-none object-cover pointer-events-none rounded-[20px] size-full",
  },
  md: {
    container: "content-stretch flex h-[255px] items-center w-[180px]",
    frame: "flex-[1_0_0] h-full min-h-px min-w-px relative rounded-[15px] shadow-[-7px_7px_4px_0px_rgba(0,0,0,0.25)]",
    image: "absolute inset-0 max-w-none object-cover pointer-events-none rounded-[15px] size-full",
  },
  sm: {
    container: "content-stretch flex h-[128px] items-center w-[90px]",
    frame: "flex-[1_0_0] h-full min-h-px min-w-px relative rounded-[15px] shadow-[-7px_7px_4px_0px_rgba(0,0,0,0.25)]",
    image: "absolute inset-0 max-w-none object-cover pointer-events-none rounded-[15px] size-full",
  },
} as const;

const dinoDiets: Record<DinoName, "herbivore" | "carnivore"> = {
  Apatosaurus: "herbivore",
  Brachiosaurus: "herbivore",
  Gallimimus: "carnivore",
  Megalosaurus: "carnivore",
  Plateosaurus: "herbivore",
  Spinosaurus: "carnivore",
  Stegosaurus: "herbivore",
  Styracosaurus: "herbivore",
  Tyrannosaurus: "carnivore",
  Utahraptor: "carnivore",
};

const labelStyles = {
  Main: {
    wrapper: "absolute right-[-1%] top-[1%] flex aspect-square w-[35%] items-center justify-center",
    ring: "relative flex aspect-square w-[82%] rotate-[15deg] items-center justify-center rounded-full border-[clamp(7.2917px,4.2292cqw,27.3438px)]",
    text: "text-[clamp(29.1667px,14.5833cqw,93.3333px)]",
  },
  sm: {
    wrapper: "-translate-x-1/2 -translate-y-1/2 absolute left-1/2 top-1/2 flex aspect-square w-[82%] items-center justify-center",
    ring: "relative flex aspect-square w-[82%] rotate-[15deg] items-center justify-center rounded-full border-[clamp(4px,10cqw,9px)]",
    text: "text-[clamp(18px,34cqw,30.72px)]",
  },
} as const;

function DinoLabel({ diet, size }: { diet: "herbivore" | "carnivore"; size: "Main" | "sm" }) {
  const label = diet === "herbivore" ? "H" : "C";
  const colorClass = diet === "herbivore" ? "border-[#17c964] text-[#17c964]" : "border-[#ff383c] text-[#ff383c]";
  const styles = labelStyles[size];

  return (
    <div aria-hidden="true" className={styles.wrapper}>
      <div className={`${styles.ring} ${colorClass}`}>
        <span
          className={`font-bold leading-[1.34] ${styles.text}`}
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export function Dino({ className, dino = "Apatosaurus", labelled1 = false, diet, size = "Main", digit = "9" }: DinoProps) {
  const resolvedSize = size === "Main" ? "Main" : size === "sm" ? "sm" : "md";
  const defaultClassNames = dino === "Number" ? "h-[255px] w-[180px]" : sizeStyles[resolvedSize].container;
  const shouldShowLabel = dino !== "Number" && labelled1 && resolvedSize !== "md";
  const frameClassName =
    shouldShowLabel && resolvedSize === "sm"
      ? sizeStyles[resolvedSize].frame.replaceAll("rounded-[15px]", "rounded-[20px]")
      : sizeStyles[resolvedSize].frame;
  const imageClassName =
    shouldShowLabel && resolvedSize === "sm"
      ? sizeStyles[resolvedSize].image.replaceAll("rounded-[15px]", "rounded-[20px]")
      : sizeStyles[resolvedSize].image;
  const imageSizes = resolvedSize === "Main" ? "636px" : resolvedSize === "md" ? "180px" : "90px";

  return (
    <div className={className || `relative ${defaultClassNames}`} style={{ containerType: "inline-size" }}>
      {dino !== "Number" && (
        <div className={frameClassName}>
          <Image fill alt={dino} className={imageClassName} sizes={imageSizes} src={dinoImages[dino]} />
        </div>
      )}
      {shouldShowLabel && <DinoLabel diet={diet ?? dinoDiets[dino]} size={resolvedSize} />}
      {dino === "Number" && (
        <div className="relative h-full w-full">
          <div
            className="-translate-x-1/2 -translate-y-1/2 absolute h-[256px] left-1/2 rounded-[15px] shadow-[-7px_7px_4px_0px_rgba(0,0,0,0.25)] top-1/2 w-[180px]"
            style={{
              backgroundImage:
                "url('data:image/svg+xml;utf8,<svg viewBox=\\'0 0 180 256\\' xmlns=\\'http://www.w3.org/2000/svg\\' preserveAspectRatio=\\'none\\'><rect x=\\'0\\' y=\\'0\\' height=\\'100%\\' width=\\'100%\\' fill=\\'url(%23grad)\\' opacity=\\'1\\'/><defs><radialGradient id=\\'grad\\' gradientUnits=\\'userSpaceOnUse\\' cx=\\'0\\' cy=\\'0\\' r=\\'10\\' gradientTransform=\\'matrix(5.5109e-16 12.8 -9 7.8377e-16 90 128)\\'><stop stop-color=\\'rgba(249,247,244,1)\\' offset=\\'0\\'/><stop stop-color=\\'rgba(230,223,216,1)\\' offset=\\'1\\'/></radialGradient></defs></svg>')",
            }}
          />
          <div className="-translate-x-1/2 -translate-y-1/2 absolute border-2 border-black border-solid content-stretch flex items-center justify-center left-1/2 px-[34px] py-[18px] rounded-[50px] top-1/2">
            <div className="flex flex-col font-[family-name:var(--font,'Inter:Medium',sans-serif)] font-[var(--font-medium,normal)] font-medium justify-center leading-[0] relative shrink-0 text-[48px] text-black text-center whitespace-nowrap">
              <p className="leading-[1.34]">{digit}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
