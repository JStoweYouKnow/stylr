import EmptyState, { SparklesIcon } from "@/components/EmptyState";

export default function RecommendationsPage() {
  return (
    <div>
      <h2 className="text-3xl font-semibold mb-6">Outfit Recommendations</h2>

      <EmptyState
        icon={<SparklesIcon />}
        title="No recommendations yet"
        description="Upload some clothes to your closet and our AI will generate personalized outfit recommendations just for you!"
        primaryAction={{
          label: "Upload Clothes",
          href: "/upload",
        }}
        secondaryAction={{
          label: "View Closet",
          href: "/closet",
        }}
      />
    </div>
  );
}

