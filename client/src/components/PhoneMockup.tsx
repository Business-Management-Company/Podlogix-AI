import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ProfileLink } from "@shared/schema";

interface PhoneMockupProps {
  displayName: string;
  headline?: string;
  bio?: string;
  avatarUrl?: string;
  links?: ProfileLink[];
  theme?: "dark" | "light";
}

export function PhoneMockup({
  displayName,
  headline,
  bio,
  avatarUrl,
  links = [],
  theme = "dark",
}: PhoneMockupProps) {
  const isDark = theme === "dark";

  return (
    <div className="relative mx-auto" style={{ width: "280px", height: "580px" }}>
      <div
        className="absolute inset-0 rounded-[3rem] bg-black p-2 shadow-2xl"
        style={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-10" />
        
        <div
          className={`h-full w-full rounded-[2.5rem] overflow-hidden ${
            isDark ? "bg-gradient-to-b from-gray-900 to-black" : "bg-gradient-to-b from-gray-100 to-white"
          }`}
        >
          <div className="h-full overflow-y-auto px-6 pt-12 pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="w-20 h-20 ring-4 ring-primary/20">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-2xl bg-gradient-to-tr from-primary to-purple-400 text-white">
                  {displayName?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <h2 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                  {displayName || "Your Name"}
                </h2>
                {headline && (
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {headline}
                  </p>
                )}
              </div>

              {bio && (
                <p className={`text-xs leading-relaxed ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  {bio}
                </p>
              )}

              <div className="w-full space-y-3 pt-4">
                {links.length > 0 ? (
                  links.map((link, index) => (
                    <div
                      key={link.id || index}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium text-center transition-all ${
                        isDark
                          ? "bg-white/10 text-white hover:bg-white/20"
                          : "bg-gray-900/10 text-gray-900 hover:bg-gray-900/20"
                      }`}
                    >
                      {link.title}
                    </div>
                  ))
                ) : (
                  <>
                    <div
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium text-center ${
                        isDark ? "bg-white/10 text-white/50" : "bg-gray-900/10 text-gray-500"
                      }`}
                    >
                      Your first link
                    </div>
                    <div
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium text-center ${
                        isDark ? "bg-white/10 text-white/50" : "bg-gray-900/10 text-gray-500"
                      }`}
                    >
                      Another link
                    </div>
                    <div
                      className={`w-full px-4 py-3 rounded-xl text-sm font-medium text-center ${
                        isDark ? "bg-white/10 text-white/50" : "bg-gray-900/10 text-gray-500"
                      }`}
                    >
                      Add more links
                    </div>
                  </>
                )}
              </div>

              <div className={`pt-8 text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                podlogix.io
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
