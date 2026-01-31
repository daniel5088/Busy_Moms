export function WeatherSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className={`rounded-[32px] shadow-2xl p-12 transition-all duration-1000 relative overflow-hidden ${
      isDark
        ? 'bg-gradient-to-br from-[#1e2a47] via-[#2d3e5f] to-[#1a2a47]'
        : 'bg-gradient-to-br from-[#87CEEB] via-[#B0E2FF] to-[#87CEEB]'
    }`}>
      <div className={`absolute -top-1/2 -right-1/4 w-[400px] h-[400px] rounded-full blur-3xl animate-pulse ${
        isDark ? 'bg-[#6496c8]/20' : 'bg-[#a8c5d1]/15'
      }`} />

      <div className="relative z-10 space-y-8 animate-pulse">
        <div className="flex items-start justify-between mb-9">
          <div className="flex-1 space-y-2">
            <div className={`h-12 rounded-2xl w-64 ${isDark ? 'bg-[#e8e8f0]/10' : 'bg-[#2a2a2e]/10'}`} />
            <div className={`h-4 rounded-xl w-32 ${isDark ? 'bg-[#e8e8f0]/10' : 'bg-[#2a2a2e]/10'}`} />
          </div>
        </div>

        <div className="flex items-center gap-8 mb-12">
          <div className={`w-[120px] h-[120px] rounded-full ${isDark ? 'bg-[#e8e8f0]/10' : 'bg-[#2a2a2e]/10'}`} />
          <div className={`h-24 rounded-2xl w-48 ${isDark ? 'bg-[#e8e8f0]/10' : 'bg-[#2a2a2e]/10'}`} />
        </div>

        <div className="grid grid-cols-3 gap-6 mb-12">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`rounded-2xl p-5 ${
                isDark
                  ? 'bg-[#28283c]/50 border border-[#6478b4]/20'
                  : 'bg-white/60 border border-[#a8c5d1]/20'
              }`}
              style={{ backdropFilter: 'blur(10px)' }}
            >
              <div className="space-y-3">
                <div className={`h-4 rounded-xl w-16 ${isDark ? 'bg-[#e8e8f0]/10' : 'bg-[#2a2a2e]/10'}`} />
                <div className={`h-8 rounded-xl w-24 ${isDark ? 'bg-[#e8e8f0]/10' : 'bg-[#2a2a2e]/10'}`} />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className={`h-8 rounded-2xl w-48 ${isDark ? 'bg-[#e8e8f0]/10' : 'bg-[#2a2a2e]/10'}`} />
          <div className="grid grid-cols-7 gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className={`rounded-[20px] p-5 text-center ${
                  isDark
                    ? 'bg-[#232337]/50 border border-[#6478b4]/20'
                    : 'bg-white/50 border border-[#a8c5d1]/15'
                }`}
                style={{ backdropFilter: 'blur(10px)' }}
              >
                <div className="space-y-3">
                  <div className={`h-4 rounded-xl w-12 mx-auto ${isDark ? 'bg-[#e8e8f0]/10' : 'bg-[#2a2a2e]/10'}`} />
                  <div className={`h-14 w-14 rounded-full mx-auto ${isDark ? 'bg-[#e8e8f0]/10' : 'bg-[#2a2a2e]/10'}`} />
                  <div className="space-y-1">
                    <div className={`h-6 rounded-xl w-10 mx-auto ${isDark ? 'bg-[#e8e8f0]/10' : 'bg-[#2a2a2e]/10'}`} />
                    <div className={`h-5 rounded-xl w-8 mx-auto ${isDark ? 'bg-[#e8e8f0]/10' : 'bg-[#2a2a2e]/10'}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
