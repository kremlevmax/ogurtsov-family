import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { HeritageHeader } from "@/components/media/heritage-header";
import { DocumentCategorySidebar } from "@/components/media/document-category-sidebar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listAllMediaForPicker } from "@/server/repositories/media";
import { resolveDocumentCategory } from "@/lib/validation/document-category";
import styles from "@/components/media/heritage-tokens.module.css";

/**
 * "Документы" shell — sidebar (left) stays mounted across both states;
 * `children` is the one main-slot, either the gallery (`page.tsx`) or
 * the viewer (`[documentId]/page.tsx`) — two separate route files under
 * one layout, so mutual exclusion is guaranteed by the router itself,
 * not a hand-rolled ternary (STATE_FLOW_RU.md's own recommended shape,
 * expressed as Next-native nested routing instead).
 */
export default async function ArchiveLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const allMedia = await listAllMediaForPicker(supabase);
  const documents = allMedia.filter((item) => item.kind !== "photo" && !item.unlisted);

  const counts: Record<string, number> = { "": documents.length };
  for (const document of documents) {
    const category = resolveDocumentCategory(document.category);
    counts[category] = (counts[category] ?? 0) + 1;
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <div className={styles.scope}>
        <HeritageHeader />
        <div className="mx-auto w-full max-w-[1450px] px-4 pb-16">
          <div className="grid grid-cols-1 rounded-[var(--h-radius-panel)] border border-(--h-gold-500) bg-(--h-paper-light) shadow-(--h-shadow-panel) md:grid-cols-[280px_1fr]">
            <div className="border-(--h-gold-200) pb-9 md:border-r">
              <DocumentCategorySidebar counts={counts} />
            </div>
            <div className="min-w-0">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
