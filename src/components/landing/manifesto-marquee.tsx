import { RevoMark } from "@/components/brand/emblem";
import { gym } from "@/content/gym";

const items = [...gym.pillars, gym.slogan];

export function ManifestoMarquee() {
  return (
    <section aria-label="Nossos pilares" className="relative overflow-hidden border-y border-accent/15 bg-[#060a10] py-6">
      <ul className="sr-only">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="flex w-max animate-marquee gap-10 motion-reduce:animate-none" aria-hidden>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-10">
            {items.map((item) => (
              <span key={item} className="flex items-center gap-10">
                <span className="font-display text-3xl uppercase tracking-wide text-white/85 sm:text-5xl">{item}</span>
                <RevoMark className="size-7 text-accent/70 sm:size-9" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
