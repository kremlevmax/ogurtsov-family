import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentViewer } from "@/components/media/document-viewer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDocumentDetail } from "@/server/repositories/media";

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
  const document = await getDocumentDetail(supabase, documentId);
  if (!document) notFound();

  return <DocumentViewer document={document} />;
}
