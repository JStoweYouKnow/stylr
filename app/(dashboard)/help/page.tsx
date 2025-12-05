"use client";

import Link from "next/link";
import Button from "@/components/Button";
import { ShirtIcon, SparklesIcon, ChartIcon } from "@/components/EmptyState";

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">How Stylr Works</h1>
        <p className="text-gray-600">
          Your guide to getting the most out of your AI-powered wardrobe assistant
        </p>
      </div>

      <div className="space-y-8">
        {/* Step 1 */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold">
              1
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <ShirtIcon className="w-8 h-8 text-gray-400" />
                <h2 className="text-2xl font-semibold">Upload Your Clothes</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Start by uploading photos of your clothing items. You can take new photos or
                use existing ones from your photo library.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                <li>Take clear, well-lit photos of each item</li>
                <li>Upload one item at a time for best results</li>
                <li>AI will automatically analyze each piece</li>
              </ul>
              <Link href="/upload">
                <Button variant="primary" size="sm">
                  Upload Your First Item
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Step 2 */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold">
              2
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <SparklesIcon className="w-8 h-8 text-gray-400" />
                <h2 className="text-2xl font-semibold">AI Analysis</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Our AI-powered system automatically analyzes each item you upload using
                advanced computer vision technology.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="font-semibold mb-2">What AI Detects:</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                  <li>✓ Item type (shirt, pants, dress, etc.)</li>
                  <li>✓ Primary and secondary colors</li>
                  <li>✓ Patterns (solid, striped, floral, etc.)</li>
                  <li>✓ Style/vibe (casual, formal, sporty, etc.)</li>
                  <li>✓ Layering category (base, mid, outer, accessory)</li>
                  <li>✓ Fit and occasion appropriateness</li>
                </ul>
              </div>
              <p className="text-sm text-gray-500">
                All analysis is done using free AI models - no subscription required!
              </p>
            </div>
          </div>
        </section>

        {/* Step 3 */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold">
              3
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <ChartIcon className="w-8 h-8 text-gray-400" />
                <h2 className="text-2xl font-semibold">Get Recommendations</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Once you've built your digital wardrobe, Stylr helps you discover amazing
                outfit combinations you never thought of.
              </p>
              <div className="space-y-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold mb-1">Outfit of the Day</h4>
                  <p className="text-sm text-gray-600">
                    Get daily outfit suggestions based on your wardrobe and preferences
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold mb-1">Weather-Based Suggestions</h4>
                  <p className="text-sm text-gray-600">
                    AI recommends outfits based on current weather conditions
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold mb-1">Virtual Outfit Board</h4>
                  <p className="text-sm text-gray-600">
                    Drag and drop items to create and visualize outfit combinations
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold mb-1">Color Harmony Validator</h4>
                  <p className="text-sm text-gray-600">
                    Check if your outfit colors work well together (0-10 score)
                  </p>
                </div>
              </div>
              <Link href="/recommendations">
                <Button variant="primary" size="sm">
                  View Recommendations
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Step 4 */}
        <section className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold">
              4
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-3">Track & Analyze</h2>
              <p className="text-gray-600 mb-4">
                Stylr helps you understand your wardrobe better with powerful analytics
                and tracking features.
              </p>
              <div className="space-y-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold mb-1">Wear Tracking</h4>
                  <p className="text-sm text-gray-600">
                    Log what you wear and discover forgotten items in your closet
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold mb-1">Wardrobe Analytics</h4>
                  <p className="text-sm text-gray-600">
                    See color, type, and style distribution across your wardrobe
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold mb-1">Capsule Wardrobes</h4>
                  <p className="text-sm text-gray-600">
                    Generate weekly or monthly capsule wardrobes from your items
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold mb-1">Fashion Trends</h4>
                  <p className="text-sm text-gray-600">
                    Stay updated with the latest fashion trends from top publications
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Link href="/analytics">
                  <Button variant="primary" size="sm">
                    View Analytics
                  </Button>
                </Link>
                <Link href="/wear-tracking">
                  <Button variant="secondary" size="sm">
                    Track Wears
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* AI Chat Assistant */}
        <section className="bg-gradient-to-r from-black to-gray-800 rounded-lg shadow-lg p-6 text-white">
          <h2 className="text-2xl font-semibold mb-3">💬 AI Style Chat Assistant</h2>
          <p className="text-gray-300 mb-4">
            Have questions about styling? Ask our AI assistant! It knows your entire
            wardrobe and can provide personalized advice on:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
            <li>What to wear for specific occasions</li>
            <li>How to style specific items</li>
            <li>Color combinations and fashion tips</li>
            <li>Outfit ideas based on your wardrobe</li>
          </ul>
          <p className="text-sm text-gray-400">
            Look for the chat icon in the bottom-right corner of any page!
          </p>
        </section>

        {/* Tips & Best Practices */}
        <section className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h2 className="text-2xl font-semibold mb-3 text-blue-900">💡 Tips & Best Practices</h2>
          <div className="space-y-3 text-blue-800">
            <div>
              <h4 className="font-semibold mb-1">Photo Quality Matters</h4>
              <p className="text-sm">
                Take clear, well-lit photos against a plain background for best AI analysis
                results.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Be Consistent</h4>
              <p className="text-sm">
                Upload items regularly to keep your digital wardrobe up to date and get
                better recommendations.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Use Filters</h4>
              <p className="text-sm">
                Filter your closet by type, color, or style to quickly find what you're
                looking for.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Track Your Wears</h4>
              <p className="text-sm">
                Log what you wear to discover forgotten items and get suggestions for
                items you haven't worn in a while.
              </p>
            </div>
          </div>
        </section>

        {/* Get Started CTA */}
        <div className="text-center bg-gray-50 rounded-lg p-8">
          <h2 className="text-2xl font-semibold mb-3">Ready to Get Started?</h2>
          <p className="text-gray-600 mb-6">
            Upload your first item and start building your digital wardrobe today!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/upload">
              <Button variant="primary" size="md">
                Upload Your First Item
              </Button>
            </Link>
            <Link href="/closet">
              <Button variant="secondary" size="md">
                View Your Closet
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}






