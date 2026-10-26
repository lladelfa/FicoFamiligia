import React from "react";
import { FamilyProvider, useFamily } from "./context/FamilyContext";
import { TopAppBar } from "./components/TopAppBar";
import { TreeVisualizerView } from "./views/TreeVisualizerView";
import { StorytellingHubView } from "./views/StorytellingHubView";
import { DocumentArchiveView } from "./views/DocumentArchiveView";

const AppContent: React.FC = () => {
  const { activeView } = useFamily();

  return (
    <div className="min-h-screen bg-background flex flex-col font-hanken">
      {/* Persistent Navigation & Action Bar */}
      <TopAppBar />

      {/* Main Routed Area */}
      <div className="pt-[73px] flex-grow flex flex-col">
        {activeView === "tree" && <TreeVisualizerView />}
        {activeView === "stories" && <StorytellingHubView />}
        {activeView === "archive" && <DocumentArchiveView />}
      </div>
    </div>
  );
};

function App() {
  return (
    <FamilyProvider>
      <AppContent />
    </FamilyProvider>
  );
}

export default App;
