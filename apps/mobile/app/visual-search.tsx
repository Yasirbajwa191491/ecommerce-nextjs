import { PlaceholderScreen } from "@/features/common/PlaceholderScreen";

export default function VisualSearchScreen() {
  return (
    <PlaceholderScreen
      title="Visual search"
      description="Upload or capture a photo to find similar products using the existing server-side visual search pipeline."
      bullets={[
        "Image upload via Convex storage",
        "Similar product matching on the backend",
        "No AI provider keys in the mobile client",
      ]}
    />
  );
}
