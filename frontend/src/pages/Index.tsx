import { usePortal, PortalProvider } from "@/context/PortalContext";
import { PortalLanding } from "@/components/portal/PortalLanding";
import { PortalTransition } from "@/components/portal/PortalTransition";
import { ObservationChamber } from "@/components/portal/ObservationChamber";
import { EndScreen } from "@/components/portal/EndScreen";
import { AnimatePresence } from "framer-motion";

function PortalApp() {
  const { state } = usePortal();

  return (
    <div className="min-h-screen bg-background scanline-overlay">
      <AnimatePresence mode="wait">
        {state === "landing" && <PortalLanding key="landing" />}

        {state === "transitioning" && <PortalTransition key="transition" />}

        {(state === "quiz.loadingCamera" ||
          state === "quiz.ready" ||
          state === "quiz.waitingResponse") && (
          <ObservationChamber key="chamber" />
        )}

        {(state === "quiz.ended.win" || state === "quiz.ended.lose") && (
          <EndScreen key="end" />
        )}
      </AnimatePresence>
    </div>
  );
}

const Index = () => (
  <PortalProvider>
    <PortalApp />
  </PortalProvider>
);

export default Index;
