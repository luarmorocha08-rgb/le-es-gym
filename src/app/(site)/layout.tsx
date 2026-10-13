import { AnnouncementBar } from "@/components/layout/announcement";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { getAnnouncement } from "@/lib/data/public";

// o aviso do painel aparece em até 5 minutos (ou na hora, via revalidatePath)
export const revalidate = 300;

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const announcement = await getAnnouncement();
  return (
    <SmoothScroll>
      <SiteHeader />
      <main id="conteudo">{children}</main>
      <SiteFooter />
      {announcement && <AnnouncementBar announcement={announcement} />}
    </SmoothScroll>
  );
}
