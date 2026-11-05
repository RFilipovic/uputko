import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { Always112Banner } from "@/components/emergency/Always112Banner";
import { AppHeader } from "@/components/layout/AppHeader";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { getPatientProfile } from "@/lib/patients";
import { currentPatientId } from "@/lib/session";
import { hr } from "@/i18n/hr";

export const metadata: Metadata = { title: `${hr.chat.title} · ${hr.app.name}` };
export const dynamic = "force-dynamic";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ glas?: string }> }) {
  const { glas } = await searchParams;
  const patientId = await currentPatientId();
  const patient = patientId ? await getPatientProfile(patientId) : null;
  if (!patient) redirect(`/profil?next=${encodeURIComponent(glas === "1" ? "/chat?glas=1" : "/chat")}`);
  return (
    <PhoneFrame>
      <Always112Banner />
      <AppHeader backHref="/" title={hr.chat.title} />
      <ChatScreen autoVoice={glas === "1"} patientName={patient.name} />
    </PhoneFrame>
  );
}
