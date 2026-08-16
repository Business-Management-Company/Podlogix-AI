import { ProfilePageRenderer, type ProfilePageRendererProps } from "@/components/ProfilePageRenderer";

export type PreviewDevice = "mobile" | "tablet" | "desktop";

interface PhoneMockupProps extends ProfilePageRendererProps {
  device?: PreviewDevice;
}

export function PhoneMockup({ device = "mobile", ...rendererProps }: PhoneMockupProps) {
  if (device === "desktop") {
    return (
      <div className="mx-auto w-full max-w-[720px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center gap-1.5 border-b border-zinc-200 bg-zinc-50 px-3 py-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          <div className="ml-3 flex-1 truncate rounded-md bg-white px-2.5 py-1 text-center text-[11px] text-zinc-400">
            podlogix.io/{rendererProps.username || "you"}
          </div>
        </div>
        <div className="h-[462px] overflow-y-auto">
          <ProfilePageRenderer {...rendererProps} interactive={false} />
        </div>
      </div>
    );
  }

  if (device === "tablet") {
    return (
      <div className="relative mx-auto" style={{ width: "480px", height: "640px" }}>
        <div className="absolute inset-0 rounded-[2rem] border-[10px] border-black bg-black shadow-2xl">
          <div className="h-full w-full overflow-y-auto rounded-[1.25rem] bg-white">
            <ProfilePageRenderer {...rendererProps} interactive={false} />
          </div>
        </div>
      </div>
    );
  }

  // mobile
  return (
    <div className="relative mx-auto" style={{ width: "296px", height: "612px" }}>
      <div
        className="absolute inset-0 rounded-[3rem] bg-black p-2 shadow-2xl"
        style={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}
      >
        <div className="absolute left-1/2 top-0 z-10 h-6 w-24 -translate-x-1/2 rounded-b-2xl bg-black" />
        <div className="absolute -right-[2px] top-24 h-10 w-[3px] rounded-r bg-zinc-800" />
        <div className="absolute -left-[2px] top-20 h-6 w-[3px] rounded-l bg-zinc-800" />
        <div className="absolute -left-[2px] top-32 h-10 w-[3px] rounded-l bg-zinc-800" />
        <div className="h-full w-full overflow-hidden rounded-[2.5rem] bg-white">
          <div className="h-full overflow-y-auto">
            <ProfilePageRenderer {...rendererProps} interactive={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
