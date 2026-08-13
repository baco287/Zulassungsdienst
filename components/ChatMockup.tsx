import { Check, Lock } from "lucide-react";
import Maxx from "./Maxx";
import { chatDemo } from "@/lib/whatsappFlow";

/**
 * Illustration eines Chatverlaufs auf der Messenger-Landingpage.
 *
 * Bewusst im eigenen Markendesign gehalten (keine Nachbildung der Oberfläche
 * oder Logos eines fremden Messengers) – es geht um die Veranschaulichung des
 * Ablaufs, nicht um ein Abbild der App.
 */
export default function ChatMockup() {
  return (
    <div
      className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border-[6px] border-ink-900 bg-white shadow-2xl"
      aria-hidden
    >
      {/* Kopfzeile */}
      <div className="flex items-center gap-3 bg-ink-900 px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white p-1">
          <Maxx pose="plain" className="h-full w-full" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold text-white">
            DeutscheZulassung
          </p>
          <p className="text-[11px] text-emerald-400">online · antwortet meist sofort</p>
        </div>
      </div>

      {/* Verlauf */}
      <div className="space-y-2.5 bg-ink-50 px-3 py-4">
        {chatDemo.map((msg) => {
          const own = msg.from === "kunde";
          return (
            <div
              key={msg.text}
              className={`flex ${own ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug shadow-sm ${
                  own
                    ? "rounded-br-md bg-brand-600 text-white"
                    : "rounded-bl-md bg-white text-ink-800"
                }`}
              >
                <p>{msg.text}</p>
                <p
                  className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                    own ? "text-brand-100" : "text-ink-400"
                  }`}
                >
                  {msg.time}
                  {own && <Check className="h-3 w-3" />}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fußzeile */}
      <div className="flex items-center justify-center gap-1.5 bg-ink-100 px-4 py-2.5 text-[10px] font-medium text-ink-500">
        <Lock className="h-3 w-3" />
        Ende-zu-Ende-verschlüsselt
      </div>
    </div>
  );
}
