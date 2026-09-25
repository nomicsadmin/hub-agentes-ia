import type { Metadata } from "next";
import { DesignSystem } from "@/components/ds/design-system";

export const metadata: Metadata = {
  title: "Design System",
};

export default function Page() {
  return <DesignSystem />;
}
