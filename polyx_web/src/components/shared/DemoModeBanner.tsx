'use client';

export default function DemoModeBanner() {
  // In a real app this would check settings context
  // For now, always hidden. Set to true to test.
  const isDemoMode = false;

  if (!isDemoMode) return null;

  return (
    <div className="flex items-center justify-center bg-amber-600/90 px-4 py-1.5 text-xs font-medium text-white">
      Demo Mode Active — trades are simulated, no real funds at risk
    </div>
  );
}
