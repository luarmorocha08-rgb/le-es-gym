/**
 * Informações institucionais da LEÕES GYM C5.
 * Fonte: perfil oficial @leoesgymc5 no Instagram. Conteúdos editáveis pelo
 * painel administrativo (tabela site_content) sobrescrevem estes valores
 * quando configurados.
 */
export const gym = {
  name: "LEÕES GYM C5",
  shortName: "Leões Gym",
  slogan: "SE VOCÊ QUER SER UM LEÃO, DEVE TREINAR COM OS LEÕES.",
  tagline: "A academia da família",
  pillars: [
    "Estrutura de grandes redes",
    "Atendimento de academia de bairro",
    "Experiência de academia premium",
  ],
  address: {
    street: "Av. Dr. Pedro Lessa, 1890",
    complement: "1º andar, sala 14",
    city: "Santos",
    state: "SP",
    zip: "11025-003",
  },
  links: {
    instagram: "https://www.instagram.com/leoesgymc5/",
    instagramHandle: "@leoesgymc5",
    whatsapp: "https://bit.ly/whatsleoesgymc5",
  },
  /** Destaques mantidos pela academia no Instagram */
  highlights: ["Grade de aulas", "Espaço Kids", "Horários"],
} as const;

export const fullAddress = `${gym.address.street}, ${gym.address.complement} — ${gym.address.city}/${gym.address.state}, ${gym.address.zip}`;

const mapsQuery = encodeURIComponent(
  `${gym.address.street}, ${gym.address.city} - ${gym.address.state}, ${gym.address.zip}`,
);
export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
export const mapsEmbedUrl = `https://maps.google.com/maps?q=${mapsQuery}&z=16&output=embed`;

/**
 * Mídias próprias da academia. Coloque os arquivos em /public/media e
 * informe os caminhos aqui (ou envie pelo painel admin quando disponível).
 * Enquanto vazios, a landing usa a cena 3D procedural — nunca imagens
 * genéricas sem relação com a academia.
 */
export const media: {
  heroVideo: string | null;
  heroPoster: string | null;
  gallery: { src: string; alt: string }[];
} = {
  heroVideo: null,
  heroPoster: null,
  gallery: [],
};
