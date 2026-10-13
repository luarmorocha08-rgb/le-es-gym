import { gym } from "@/content/gym";
import { getOpeningHours } from "@/lib/data/public";
import { siteUrl } from "@/lib/env";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Dados estruturados (schema.org) da academia para buscadores — somente informações reais. */
export async function GymStructuredData() {
  const hours = await getOpeningHours();
  const data = {
    "@context": "https://schema.org",
    "@type": "HealthClub",
    name: gym.name,
    slogan: gym.slogan,
    url: siteUrl(),
    logo: `${siteUrl()}/icons/icon-512.png`,
    image: `${siteUrl()}/opengraph-image`,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${gym.address.street}, ${gym.address.complement}`,
      addressLocality: gym.address.city,
      addressRegion: gym.address.state,
      postalCode: gym.address.zip,
      addressCountry: "BR",
    },
    sameAs: [gym.links.instagram],
    ...(hours.status === "ok" && hours.data.length > 0
      ? {
          openingHoursSpecification: hours.data.map((h) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: `https://schema.org/${DAYS[h.weekday]}`,
            opens: h.opens_at.slice(0, 5),
            closes: h.closes_at.slice(0, 5),
          })),
        }
      : {}),
  };
  // "<" escapado: o JSON nunca fecha a tag <script>
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
