"use client";

import { useRouter } from "next/navigation";
import StyleQuiz from "@/components/style-quiz";

export default function StyleQuizPage() {
  const router = useRouter();

  return (
    <div>
      <StyleQuiz
        onComplete={() => {
          router.push("/recommendations");
        }}
      />
    </div>
  );
}

