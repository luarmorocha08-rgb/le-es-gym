/**
 * Informações institucionais da REVO TRAIN.
 * Endereço e redes sociais: substituir pelos dados oficiais da unidade antes
 * da publicação. Conteúdos editáveis pelo painel administrativo (tabela
 * site_content) sobrescrevem estes valores quando configurados.
 */
export const gym = {
  name: "REVO TRAIN",
  shortName: "Revo Train",
  slogan: "TECNOLOGIA QUE MOVE A SUA EVOLUÇÃO.",
  tagline: "Treino inteligente, resultado real",
  pillars: [
    "Estrutura completa de treino",
    "Acompanhamento próximo e humano",
    "Tecnologia e IA a favor da sua evolução",
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
 * Mídias próprias da academia em /public/media. O que for enviado pelo painel
 * (Administração → Conteúdo) tem prioridade sobre estes valores.
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
