"use client";

import { useState } from "react";

interface QuizAnswers {
  preferredStyles: string[];
  occasionFrequency: Record<string, number>;
  favoriteColors: string[];
  bodyType: string;
  climate: string;
}

const STYLES = [
  "Minimalist",
  "Streetwear",
  "Preppy",
  "Bohemian",
  "Classic",
  "Edgy",
  "Casual",
  "Formal",
];

const COLORS = [
  "Black",
  "White",
  "Navy",
  "Gray",
  "Beige",
  "Brown",
  "Blue",
  "Green",
  "Red",
  "Pink",
  "Purple",
  "Yellow",
];

const BODY_TYPES = ["Petite", "Regular", "Tall", "Plus Size"];

const CLIMATES = ["Tropical", "Temperate", "Cold", "Desert"];

export default function StyleQuiz({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<QuizAnswers>({
    preferredStyles: [],
    occasionFrequency: {},
    favoriteColors: [],
    bodyType: "",
    climate: "",
  });
  const [saving, setSaving] = useState(false);

  function handleStyleToggle(style: string) {
    setAnswers((prev) => ({
      ...prev,
      preferredStyles: prev.preferredStyles.includes(style)
        ? prev.preferredStyles.filter((s) => s !== style)
        : [...prev.preferredStyles, style],
    }));
  }

  function handleColorToggle(color: string) {
    setAnswers((prev) => ({
      ...prev,
      favoriteColors: prev.favoriteColors.includes(color)
        ? prev.favoriteColors.filter((c) => c !== color)
        : [...prev.favoriteColors, color],
    }));
  }

  function handleOccasionFrequency(occasion: string, days: number) {
    setAnswers((prev) => ({
      ...prev,
      occasionFrequency: {
        ...prev.occasionFrequency,
        [occasion]: days,
      },
    }));
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/style-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });

      if (!res.ok) throw new Error("Failed to save");

      if (onComplete) {
        onComplete();
      } else {
        alert("Style profile saved! Your recommendations will be personalized.");
        setStep(1);
        setAnswers({
          preferredStyles: [],
          occasionFrequency: {},
          favoriteColors: [],
          bodyType: "",
          climate: "",
        });
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save style profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Style Quiz</h2>
          <span className="text-sm text-gray-500">Step {step} of 5</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-black h-2 rounded-full transition-all"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Preferred Styles */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">What styles do you prefer?</h3>
          <p className="text-gray-600">Select all that apply</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STYLES.map((style) => (
              <button
                key={style}
                onClick={() => handleStyleToggle(style)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  answers.preferredStyles.includes(style)
                    ? "border-black bg-black text-white"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={answers.preferredStyles.length === 0}
            className="w-full mt-6 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Step 2: Occasion Frequency */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">How often do you dress for these occasions?</h3>
          <div className="space-y-4">
            {["Work", "Formal", "Casual", "Sporty"].map((occasion) => (
              <div key={occasion} className="p-4 border rounded-lg">
                <label className="block mb-2 font-medium">{occasion}</label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((days) => (
                    <button
                      key={days}
                      onClick={() => handleOccasionFrequency(occasion.toLowerCase(), days)}
                      className={`flex-1 py-2 border rounded ${
                        answers.occasionFrequency[occasion.toLowerCase()] === days
                          ? "bg-black text-white border-black"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {days}x/week
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 px-6 py-3 border rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Favorite Colors */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">What are your favorite colors?</h3>
          <p className="text-gray-600">Select your top colors</p>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorToggle(color)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  answers.favoriteColors.includes(color)
                    ? "border-black bg-black text-white"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 px-6 py-3 border rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Body Type & Climate */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Body Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {BODY_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setAnswers((prev) => ({ ...prev, bodyType: type }))}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    answers.bodyType === type
                      ? "border-black bg-black text-white"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Climate</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CLIMATES.map((climate) => (
                <button
                  key={climate}
                  onClick={() => setAnswers((prev) => ({ ...prev, climate }))}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    answers.climate === climate
                      ? "border-black bg-black text-white"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {climate}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(3)}
              className="flex-1 px-6 py-3 border rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(5)}
              disabled={!answers.bodyType || !answers.climate}
              className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Review & Submit */}
      {step === 5 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Review Your Answers</h3>
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <strong>Preferred Styles:</strong> {answers.preferredStyles.join(", ") || "None"}
            </div>
            <div>
              <strong>Occasion Frequency:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                {Object.entries(answers.occasionFrequency).map(([occ, days]) => (
                  <li key={occ}>
                    {occ}: {days}x/week
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Favorite Colors:</strong> {answers.favoriteColors.join(", ") || "None"}
            </div>
            <div>
              <strong>Body Type:</strong> {answers.bodyType || "Not selected"}
            </div>
            <div>
              <strong>Climate:</strong> {answers.climate || "Not selected"}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(4)}
              className="flex-1 px-6 py-3 border rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Complete Quiz"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

