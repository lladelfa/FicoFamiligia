import React, { useEffect, useRef } from "react";

interface WaveformVisualizerProps {
  isRecording: boolean;
  isPaused: boolean;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ isRecording, isPaused }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas resolution for crisp display
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Render loop
    const render = () => {
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      
      ctx.clearRect(0, 0, w, h);

      // Define wave configuration
      let targetAmplitude = isRecording && !isPaused ? 30 : 4;
      let speed = isRecording && !isPaused ? 0.08 : 0.015;
      
      phaseRef.current += speed;

      // Draw 3 layers of overlapping waves
      const waves = [
        { color: "rgba(45, 90, 39, 0.4)", freq: 0.015, ampMultiplier: 1, offset: 0 },
        { color: "rgba(214, 202, 221, 0.5)", freq: 0.025, ampMultiplier: 0.7, offset: Math.PI / 3 },
        { color: "rgba(45, 90, 39, 0.15)", freq: 0.008, ampMultiplier: 1.2, offset: Math.PI / 1.5 }
      ];

      waves.forEach(wave => {
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = wave.ampMultiplier === 1 ? 2.5 : 1.5;
        ctx.lineCap = "round";

        const midY = h / 2;

        for (let x = 0; x < w; x++) {
          // Compute sine position
          const angle = x * wave.freq + phaseRef.current + wave.offset;
          
          // Fade wave out at the edges
          const edgeDecay = Math.sin((x / w) * Math.PI);
          
          const y = midY + Math.sin(angle) * targetAmplitude * wave.ampMultiplier * edgeDecay;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, isPaused]);

  return (
    <div className="w-full h-24 bg-surface-low/30 rounded-2xl border border-outline-variant/30 overflow-hidden relative flex items-center justify-center">
      <canvas ref={canvasRef} className="w-full h-full block" />
      {!isRecording && (
        <span className="absolute text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest pointer-events-none select-none">
          Microphone Standby
        </span>
      )}
    </div>
  );
};
