import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Stylr</h1>
        <p className="text-gray-600 mb-8">Your smart AI-powered wardrobe assistant</p>
        <Link
          href="/closet"
          className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
        >
          Go to Closet
        </Link>
      </div>
    </div>
  );
}

