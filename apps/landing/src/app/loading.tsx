export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
        <div className="text-lg font-medium text-gray-900 mb-2">Loading BizBox</div>
        <div className="text-sm text-gray-600">Preparing your business platform...</div>
      </div>
    </div>
  );
}