import type { Metadata } from "next";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { Always112Banner } from "@/components/emergency/Always112Banner";
import { AppHeader } from "@/components/layout/AppHeader";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
import { hr } from "@/i18n/hr";

export const metadata: Metadata = {
  title: `${hr.chat.title} · ${hr.app.name}`,
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ glas?: string }>;
}) {
  const { glas } = await searchParams;
  return (
    <PhoneFrame>
      <Always112Banner />
      <AppHeader backHref="/" title={hr.chat.title} />
      <ChatScreen autoVoice={glas === "1"} />
    </PhoneFrame>
  );
}
