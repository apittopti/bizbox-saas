export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          BizBox Admin
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Welcome to the BizBox Admin Portal
        </p>
        <div className="space-y-4">
          <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
            Dashboard
          </button>
          <button className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300">
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}