import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { Always112Banner } from "@/components/emergency/Always112Banner";
import { AppHeader } from "@/components/layout/AppHeader";
import { getPatientProfile } from "@/lib/patients";
import { currentPatientId } from "@/lib/session";
import { hr } from "@/i18n/hr";

export const metadata: Metadata = {
  title: `${hr.chat.title} · ${hr.app.name}`,
};
export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ glas?: string }>;
}) {
  const { glas } = await searchParams;
  const patientId = await currentPatientId();
  const patient = patientId ? await getPatientProfile(patientId) : null;
  if (!patient)
    redirect(
      `/profil?next=${encodeURIComponent(glas === "1" ? "/chat?glas=1" : "/chat")}`,
    );
  return (
    // Full screen like a chat app: only the conversation scrolls.
    <div className="relative flex h-dvh flex-col overflow-hidden overscroll-none bg-background">
      <Always112Banner />
      <AppHeader
        backHref="/"
        title={hr.chat.title}
        className="mx-auto max-w-5xl"
      />
      <ChatScreen autoVoice={glas === "1"} patientName={patient.name} />
    </div>
  );
}
