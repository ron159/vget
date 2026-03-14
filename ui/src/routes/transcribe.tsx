import { createFileRoute } from "@tanstack/react-router";
import { TranscribePage } from "../pages/TranscribePage";

export const Route = createFileRoute("/transcribe")({
  component: TranscribePage,
});
