import { Bot, Mic } from "lucide-react";
import { AudioPlayer } from "./AudioPlayer";

interface RealModeMessage {
  id: string;
  sender: "ai" | "user";
  duration: string;
}

interface RealModeChatProps {
  messages: RealModeMessage[];
}

const defaultMessages: RealModeMessage[] = [
  { id: "1", sender: "ai", duration: "0:42" },
  { id: "2", sender: "user", duration: "0:28" },
  { id: "3", sender: "ai", duration: "0:35" },
];

export function RealModeChatMessages({ messages = defaultMessages }: RealModeChatProps) {
  return (
    <div className="flex flex-1 flex-col gap-5 overflow-auto rounded-b-[16px] bg-[var(--color-bg)] p-6 px-8">
      {messages.map((msg) =>
        msg.sender === "ai" ? (
          <div key={msg.id} className="flex w-full gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-dark)]">
              <Bot size={20} className="text-white" />
            </div>
            <div className="w-[320px] rounded-[16px] bg-[var(--color-surface)] p-3 shadow-[0_2px_8px_#0000000a]">
              <AudioPlayer duration={msg.duration} variant="light" />
            </div>
          </div>
        ) : (
          <div key={msg.id} className="flex w-full justify-end gap-3">
            <div className="w-[320px] rounded-[16px] bg-[var(--color-dark)] p-3">
              <AudioPlayer duration={msg.duration} variant="dark" />
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-indigo)]">
              <span className="text-[14px] font-semibold text-white">JD</span>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export function RealModeInput() {
  return (
    <div className="flex flex-col items-center gap-4 bg-[var(--color-bg)] px-8 pb-8 pt-6">
      <button className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[var(--color-green)] shadow-[0_4px_16px_#22C55E30]">
        <Mic size={28} className="text-white" />
      </button>
      <span className="text-[13px] font-medium text-[var(--color-text-muted)]">Tap to speak</span>
    </div>
  );
}
