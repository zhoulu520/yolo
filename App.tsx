
import React, { useState, useEffect, useRef } from 'react';
import Scene3D from './components/Scene3D';
import HandTracker from './components/HandTracker';
import { TreeState, HandData } from './types';

const App: React.FC = () => {
  const [handData, setHandData] = useState<HandData>({
    isOpen: false,
    rotation: { x: 0, y: 0, z: 0 },
    position: { x: 0, y: 0 },
    detected: false
  });

  const [treeState, setTreeState] = useState<TreeState>(TreeState.CLOSED);

  // Transition logic based on hand gesture
  useEffect(() => {
    if (handData.detected) {
      if (handData.isOpen && treeState === TreeState.CLOSED) {
        setTreeState(TreeState.SCATTERED);
      } else if (!handData.isOpen && treeState === TreeState.SCATTERED) {
        setTreeState(TreeState.CLOSED);
      }
    }
  }, [handData.isOpen, handData.detected, treeState]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050505]">
      {/* 3D Visuals */}
      <Scene3D treeState={treeState} handData={handData} />

      {/* Hand Tracking Layer - Showing camera feed without labels */}
      <div className="absolute top-4 right-4 w-56 h-42 rounded-xl border-2 border-white/30 overflow-hidden bg-black shadow-2xl z-10 transition-all duration-300 hover:scale-105">
        <HandTracker onHandUpdate={setHandData} />
      </div>

      {/* Empty UI Overlay to maintain structure if needed, or simply removed */}
      <div className="absolute inset-x-0 bottom-12 pointer-events-none flex flex-col items-center justify-center text-center space-y-4">
        {/* Title removed */}
        {/* Instructions removed */}
      </div>

      {/* Instruction Toast removed */}
    </div>
  );
};

export default App;
