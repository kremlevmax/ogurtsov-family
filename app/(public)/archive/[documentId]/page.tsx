import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentViewer } from "@/components/media/document-viewer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDocumentDetail } from "@/server/repositories/media";
import { listPeople } from "@/server/repositories/people";
import { getLoungeViewer } from "@/server/auth/require-lounge-member";

interface ArchiveDocumentPageProps {
  params: Promise<{ documentId: string }>;
}

export async function generateMetadata({ params }: ArchiveDocumentPageProps): Promise<Metadata> {
  const { documentId } = await params;
  const supabase = await createSupabaseServerClient();
  const document = await getDocumentDetail(supabase, documentId);
  if (!document) return { title: "Документ не найден" };
  return { title: document.title, description: document.caption ?? undefined };
}

export default async function ArchiveDocumentPage({ params }: ArchiveDocumentPageProps) {
  const { documentId } = await params;
  const supabase = await createSupabaseServerClient();
  const [document, viewer, allPeople] = await Promise.all([
    getDocumentDetail(supabase, documentId),
    getLoungeViewer(),
    listPeople(supabase),
  ]);
  if (!document) notFound();

  return (
    <DocumentViewer document={document} viewerId={viewer.userId} isEditor={viewer.isEditor} allPeople={allPeople} />
  );
}
