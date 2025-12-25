
import React, { useEffect, useRef } from 'react';
import { HandData } from '../types';

interface HandTrackerProps {
  onHandUpdate: (data: HandData) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onHandUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const mpHands = (window as any).Hands;
    const mpCamera = (window as any).Camera;

    const hands = new mpHands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults((results: any) => {
      const canvasCtx = canvasRef.current?.getContext('2d');
      if (!canvasCtx || !canvasRef.current) return;

      // Draw the camera feed to the canvas (revealing the face)
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // Gesture Logic: Fist vs Open Palm
        const wrist = landmarks[0];
        const fingerTips = [8, 12, 16, 20].map(idx => landmarks[idx]);
        
        const avgDist = fingerTips.reduce((acc, tip) => {
          const dx = tip.x - wrist.x;
          const dy = tip.y - wrist.y;
          return acc + Math.sqrt(dx * dx + dy * dy);
        }, 0) / fingerTips.length;

        const isOpen = avgDist > 0.35;

        const middleBase = landmarks[9];
        const dx = middleBase.x - wrist.x;
        const dy = middleBase.y - wrist.y;
        const angle = Math.atan2(dy, dx);

        onHandUpdate({
          isOpen,
          rotation: { x: dy * 2, y: dx * 2, z: angle },
          position: { x: landmarks[9].x, y: landmarks[9].y },
          detected: true
        });

        // Draw hand tracking indicator
        canvasCtx.fillStyle = isOpen ? '#00ff00' : '#ff0000';
        canvasCtx.beginPath();
        canvasCtx.arc(landmarks[9].x * canvasRef.current.width, landmarks[9].y * canvasRef.current.height, 5, 0, Math.PI * 2);
        canvasCtx.fill();
        canvasCtx.strokeStyle = 'white';
        canvasCtx.lineWidth = 2;
        canvasCtx.stroke();
      } else {
        onHandUpdate({
          isOpen: false,
          rotation: { x: 0, y: 0, z: 0 },
          position: { x: 0, y: 0 },
          detected: false
        });
      }
      canvasCtx.restore();
    });

    const camera = new mpCamera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current! });
      },
      width: 640,
      height: 480
    });

    camera.start();

    return () => {
      camera.stop();
      hands.close();
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas 
        ref={canvasRef} 
        width={320} 
        height={240} 
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default HandTracker;
